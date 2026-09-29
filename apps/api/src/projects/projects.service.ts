import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { projectSchema, type ProjectWithNav } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { ConflictException, DatabaseException, NotFoundException, ValidationException } from "../common/exceptions/exceptions.js";
import { isUniqueViolation } from "../common/db/is-unique-violation.js";
import { zodIssuesToSource } from "../common/validation/zod-issues-to-source.js";
import { CacheService } from "../common/cache/cache.service.js";
import { RevisionsService } from "../revisions/revisions.service.js";
import type { UpsertProjectDto } from "./dto/upsert-project.dto.js";
import { caseStudySectionBodySchemas, isCaseStudySectionKind, type CaseStudySectionKind } from "./case-study-section-body.schema.js";
import { PROJECTS_CACHE_KEY_ALL as CACHE_KEY_ALL } from "./projects-cache-keys.js";

const CACHE_TTL_SECONDS = 60;

type ProjectRow = typeof schema.projects.$inferSelect;
type CaseStudySectionRow = typeof schema.caseStudySections.$inferSelect;

type ProjectScalarFields = Pick<
  ProjectRow,
  "slug" | "title" | "kicker" | "summary" | "years" | "featured" | "stackTags" | "order"
>;

/** Shape of `projects.draftData` — see the field's comment in db/schema/index.ts. */
type ProjectDraftData = Partial<ProjectScalarFields> & {
  sections?: Partial<Record<CaseStudySectionKind, unknown>>;
};

/** Shape recorded into `revisions.snapshot` for entityType "project" — see restoreFromRevision. */
interface ProjectSnapshot extends ProjectScalarFields {
  sections: Partial<Record<CaseStudySectionKind, unknown>>;
}

/**
 * "Published only" is enforced HERE, in the repository-shaped query
 * itself (backend PRD §13) — not as a filter applied to an already-
 * fetched list. There is no code path in this service that can return
 * a draft project or an unpublished diagram version, regardless of
 * what a caller asks for (there is no query parameter that even
 * requests draft content — see backend PRD §5).
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
    private readonly revisions: RevisionsService,
  ) {}

  async getProjects(featured?: boolean): Promise<ProjectWithNav[]> {
    const all = await this.getAllWithNav();
    return featured === undefined ? all : all.filter((p) => p.featured === featured);
  }

  async getProject(slug: string): Promise<ProjectWithNav | null> {
    const all = await this.getAllWithNav();
    return all.find((p) => p.slug === slug) ?? null;
  }

  /**
   * One assembly path backs both getProjects and getProject (backend
   * PRD's own read-model note) — prevSlug/nextSlug are derived from
   * this full, published, ordered list, same as apps/web's static
   * content adapter, so a featured-only or single-project caller still
   * sees a project's real neighbors, not neighbors within whatever
   * subset it happened to ask for.
   */
  private async getAllWithNav(): Promise<ProjectWithNav[]> {
    return this.cache.wrap(CACHE_KEY_ALL, CACHE_TTL_SECONDS, async () => {
      const rows = await this.db.query.projects.findMany({
        where: eq(schema.projects.status, "published"),
        orderBy: asc(schema.projects.order),
      });

      const assembled = await Promise.all(rows.map((row) => this.assemble(row)));

      return assembled.map((project, i) => ({
        ...project,
        prevSlug: assembled[i - 1]?.slug ?? null,
        nextSlug: assembled[i + 1]?.slug ?? null,
      }));
    });
  }

  private async assemble(row: ProjectRow) {
    const sections = await this.db.query.caseStudySections.findMany({
      where: eq(schema.caseStudySections.projectId, row.id),
    });

    const byKind = new Map(sections.map((s) => [s.kind, s.body]));
    const context = byKind.get("context");
    const constraints = byKind.get("constraints");
    const decisions = byKind.get("decisions");
    const outcome = byKind.get("outcome");
    if (context === undefined || constraints === undefined || decisions === undefined || outcome === undefined) {
      throw new DatabaseException(`Project "${row.slug}" is missing one or more case-study sections`);
    }

    const diagramRow = await this.db.query.diagrams.findFirst({
      where: and(eq(schema.diagrams.ownerType, "project"), eq(schema.diagrams.ownerId, row.id)),
    });
    // publishedVersion is the only publish gate this milestone has —
    // M1d designs the real draft-vs-published snapshot mechanism; for
    // now a diagram row only exists at all once it's been written, and
    // publishedVersion is set the same moment (see apps/api/src/db/
    // seed.ts), so this can never leak an unpublished diagram today.
    const diagram =
      diagramRow && diagramRow.publishedVersion !== null
        ? {
            id: diagramRow.id,
            schemaVersion: diagramRow.schemaVersion,
            nodes: diagramRow.nodes,
            edges: diagramRow.edges,
            groups: diagramRow.groups ?? undefined,
          }
        : null;

    return projectSchema.parse({
      slug: row.slug,
      title: row.title,
      kicker: row.kicker,
      summary: row.summary,
      years: row.years,
      featured: row.featured,
      stack: row.stackTags,
      diagram,
      context,
      constraints,
      decisions,
      outcome,
    });
  }

  // ---------------------------------------------------------------
  // Admin CRUD + draft/publish + revisions (M1d/3)
  //
  // Draft/publish rule (projects.draftData's own comment, restated):
  // while status='draft', every write below lands directly on the
  // row's own columns (project scalar fields) or the section's own
  // row — there's no public audience to protect yet. Once
  // status='published', the SAME write instead merges into
  // draftData (project scalars at the top level, section bodies
  // nested under draftData.sections[kind] — a case study "publishes
  // as a whole, not section-by-section" per PRD §4 and the user's
  // explicit choice, so a section edit on a published project is
  // staged exactly like a project-field edit, never applied live).
  // publish() is the one place that copies draftData onto the live
  // columns/rows, in a single transaction, then clears it.
  // ---------------------------------------------------------------

  /** Effective (draft-merged) view of one project + its sections, for the admin editor. */
  private buildEffectiveSnapshot(row: ProjectRow, sectionRows: CaseStudySectionRow[]): ProjectSnapshot {
    const draft = (row.draftData as ProjectDraftData | null) ?? {};
    const sections: Partial<Record<CaseStudySectionKind, unknown>> = {};
    for (const section of sectionRows) {
      sections[section.kind] = draft.sections?.[section.kind] ?? section.body;
    }
    return {
      slug: draft.slug ?? row.slug,
      title: draft.title ?? row.title,
      kicker: draft.kicker ?? row.kicker,
      summary: draft.summary ?? row.summary,
      years: draft.years ?? row.years,
      featured: draft.featured ?? row.featured,
      stackTags: draft.stackTags ?? row.stackTags,
      order: draft.order ?? row.order,
      sections,
    };
  }

  private toAdminView(row: ProjectRow, sectionRows: CaseStudySectionRow[]) {
    return {
      id: row.id,
      status: row.status,
      publishedAt: row.publishedAt,
      hasPendingDraft: row.draftData !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...this.buildEffectiveSnapshot(row, sectionRows),
    };
  }

  async listForAdmin() {
    return this.db.query.projects.findMany({ orderBy: asc(schema.projects.order) });
  }

  async getForAdmin(id: string) {
    const row = await this.db.query.projects.findFirst({ where: eq(schema.projects.id, id) });
    if (!row) throw new NotFoundException(`Project "${id}" not found.`);
    const sections = await this.db.query.caseStudySections.findMany({
      where: eq(schema.caseStudySections.projectId, id),
      orderBy: asc(schema.caseStudySections.order),
    });
    return this.toAdminView(row, sections);
  }

  async create(dto: UpsertProjectDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      let row: ProjectRow | undefined;
      try {
        [row] = await tx.insert(schema.projects).values({ ...dto, status: "draft" }).returning();
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Project "${dto.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Project insert returned no row");

      const snapshot = this.buildEffectiveSnapshot(row, []);
      await this.revisions.record(tx, "project", row.id, snapshot, authorId);
      return this.toAdminView(row, []);
    });
  }

  async update(id: string, dto: UpsertProjectDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.projects.findFirst({ where: eq(schema.projects.id, id) });
      if (!existing) throw new NotFoundException(`Project "${id}" not found.`);

      let row: ProjectRow | undefined;
      try {
        if (existing.status === "draft") {
          [row] = await tx
            .update(schema.projects)
            .set({ ...dto, updatedAt: new Date() })
            .where(eq(schema.projects.id, id))
            .returning();
        } else {
          // Published: stage into draftData, never touch the live
          // columns. No DB-level slug-uniqueness check happens here —
          // a colliding slug only ever surfaces at publish() time,
          // when it would actually go live.
          const nextDraftData: ProjectDraftData = { ...((existing.draftData as ProjectDraftData | null) ?? {}), ...dto };
          [row] = await tx
            .update(schema.projects)
            .set({ draftData: nextDraftData, updatedAt: new Date() })
            .where(eq(schema.projects.id, id))
            .returning();
        }
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Project "${dto.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Project update returned no row");

      const sections = await tx.query.caseStudySections.findMany({ where: eq(schema.caseStudySections.projectId, id) });
      const snapshot = this.buildEffectiveSnapshot(row, sections);
      await this.revisions.record(tx, "project", id, snapshot, authorId);
      return this.toAdminView(row, sections);
    });
  }

  /**
   * `kindParam` comes from the URL (:kind), so it can't be checked by
   * the request-body Zod pipe — validated here instead, along with
   * `rawBody` against the kind-specific schema, before anything is
   * written (nestjs-craft: validate at the boundary, just a later one
   * than usual since the schema itself depends on the route).
   */
  async upsertSection(projectId: string, kindParam: string, rawBody: unknown, authorId: string) {
    if (!isCaseStudySectionKind(kindParam)) {
      throw new ValidationException("Validation failed", {
        kind: [`"${kindParam}" is not a valid case-study section kind.`],
      });
    }
    const kind = kindParam;
    const parsedBody = caseStudySectionBodySchemas[kind].safeParse(rawBody);
    if (!parsedBody.success) throw new ValidationException("Validation failed", zodIssuesToSource(parsedBody.error.issues));
    const body = parsedBody.data;

    return this.db.transaction(async (tx) => {
      const project = await tx.query.projects.findFirst({ where: eq(schema.projects.id, projectId) });
      if (!project) throw new NotFoundException(`Project "${projectId}" not found.`);

      let row = project;
      if (project.status === "draft") {
        await tx
          .insert(schema.caseStudySections)
          .values({ projectId, kind, body })
          .onConflictDoUpdate({
            target: [schema.caseStudySections.projectId, schema.caseStudySections.kind],
            set: { body, updatedAt: new Date() },
          });
      } else {
        // Published: nest under draftData.sections[kind] — this is the
        // user-confirmed "full PRD-faithful nested draft" decision. The
        // section's own row is untouched until publish().
        const existingDraft = (project.draftData as ProjectDraftData | null) ?? {};
        const nextDraftData: ProjectDraftData = {
          ...existingDraft,
          sections: { ...existingDraft.sections, [kind]: body },
        };
        const [updated] = await tx
          .update(schema.projects)
          .set({ draftData: nextDraftData, updatedAt: new Date() })
          .where(eq(schema.projects.id, projectId))
          .returning();
        if (!updated) throw new Error("Project draft update returned no row");
        row = updated;
      }

      const sections = await tx.query.caseStudySections.findMany({ where: eq(schema.caseStudySections.projectId, projectId) });
      const snapshot = this.buildEffectiveSnapshot(row, sections);
      await this.revisions.record(tx, "project", projectId, snapshot, authorId);
      return this.toAdminView(row, sections);
    });
  }

  /**
   * Copies draftData (project scalars + staged section bodies) onto
   * the live columns/rows in one transaction, then clears draftData —
   * the one place a case study actually goes live, as a whole (PRD
   * §4). A draft-status project with no prior publish has nothing
   * staged in draftData, so this just flips status/publishedAt.
   */
  async publish(id: string, authorId: string) {
    const { liveRow, sections } = await this.db.transaction(async (tx) => {
      const project = await tx.query.projects.findFirst({ where: eq(schema.projects.id, id) });
      if (!project) throw new NotFoundException(`Project "${id}" not found.`);

      const draft = (project.draftData as ProjectDraftData | null) ?? null;
      const now = new Date();

      let liveRow: ProjectRow;
      try {
        const [row] = await tx
          .update(schema.projects)
          .set({
            slug: draft?.slug ?? project.slug,
            title: draft?.title ?? project.title,
            kicker: draft?.kicker ?? project.kicker,
            summary: draft?.summary ?? project.summary,
            years: draft?.years ?? project.years,
            featured: draft?.featured ?? project.featured,
            stackTags: draft?.stackTags ?? project.stackTags,
            order: draft?.order ?? project.order,
            status: "published",
            publishedAt: now,
            draftData: null,
            updatedAt: now,
          })
          .where(eq(schema.projects.id, id))
          .returning();
        if (!row) throw new Error("Project publish returned no row");
        liveRow = row;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Project "${draft?.slug ?? project.slug}" already exists.`);
        throw err;
      }

      if (draft?.sections) {
        for (const [kind, body] of Object.entries(draft.sections)) {
          await tx
            .update(schema.caseStudySections)
            .set({ body, updatedAt: now })
            .where(and(eq(schema.caseStudySections.projectId, id), eq(schema.caseStudySections.kind, kind as CaseStudySectionKind)));
        }
      }

      const sections = await tx.query.caseStudySections.findMany({ where: eq(schema.caseStudySections.projectId, id) });
      const snapshot = this.buildEffectiveSnapshot(liveRow, sections);
      await this.revisions.record(tx, "project", id, snapshot, authorId);
      return { liveRow, sections };
    });

    // Invalidated AFTER the transaction commits, not from inside it —
    // otherwise a read racing the still-open transaction could
    // repopulate the cache with the pre-publish value right before
    // commit, leaving it stale for a full TTL.
    await this.cache.invalidate(CACHE_KEY_ALL);
    return this.toAdminView(liveRow, sections);
  }

  async delete(id: string) {
    const [row] = await this.db.delete(schema.projects).where(eq(schema.projects.id, id)).returning();
    if (!row) throw new NotFoundException(`Project "${id}" not found.`);
    if (row.status === "published") await this.cache.invalidate(CACHE_KEY_ALL);
  }

  /**
   * Dispatched from RevisionsController for entityType "project".
   * Applies a past revision's full snapshot as if it were a fresh
   * edit — same draft-vs-published branching as update()/
   * upsertSection() above, so a restore on a published project also
   * lands in draftData (PRD §6.3: "restores to draft, never directly
   * to published"), while a draft-status project's restore just
   * continues editing it directly, same as any other draft write.
   */
  async restoreFromRevision(revision: { entityId: string; snapshot: unknown }, authorId: string) {
    const snapshot = revision.snapshot as ProjectSnapshot;

    return this.db.transaction(async (tx) => {
      const project = await tx.query.projects.findFirst({ where: eq(schema.projects.id, revision.entityId) });
      if (!project) throw new NotFoundException(`Project "${revision.entityId}" no longer exists.`);

      const dto: ProjectScalarFields = {
        slug: snapshot.slug,
        title: snapshot.title,
        kicker: snapshot.kicker,
        summary: snapshot.summary,
        years: snapshot.years,
        featured: snapshot.featured,
        stackTags: snapshot.stackTags,
        order: snapshot.order,
      };

      let row: ProjectRow | undefined;
      try {
        if (project.status === "draft") {
          [row] = await tx
            .update(schema.projects)
            .set({ ...dto, updatedAt: new Date() })
            .where(eq(schema.projects.id, project.id))
            .returning();

          if (row && snapshot.sections) {
            for (const [kind, body] of Object.entries(snapshot.sections)) {
              await tx
                .insert(schema.caseStudySections)
                .values({ projectId: project.id, kind: kind as CaseStudySectionKind, body })
                .onConflictDoUpdate({
                  target: [schema.caseStudySections.projectId, schema.caseStudySections.kind],
                  set: { body, updatedAt: new Date() },
                });
            }
          }
        } else {
          const existingDraft = (project.draftData as ProjectDraftData | null) ?? {};
          const nextDraftData: ProjectDraftData = {
            ...existingDraft,
            ...dto,
            sections: { ...existingDraft.sections, ...snapshot.sections },
          };
          [row] = await tx
            .update(schema.projects)
            .set({ draftData: nextDraftData, updatedAt: new Date() })
            .where(eq(schema.projects.id, project.id))
            .returning();
        }
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Project "${dto.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Project restore returned no row");

      const sections = await tx.query.caseStudySections.findMany({ where: eq(schema.caseStudySections.projectId, project.id) });
      const effectiveSnapshot = this.buildEffectiveSnapshot(row, sections);
      await this.revisions.record(tx, "project", project.id, effectiveSnapshot, authorId);
      return this.toAdminView(row, sections);
    });
  }
}
