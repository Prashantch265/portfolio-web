import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { buildTextEquivalent, type DiagramDoc } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { ConflictException, NotFoundException } from "../common/exceptions/exceptions.js";
import { isUniqueViolation } from "../common/db/is-unique-violation.js";
import { CacheService } from "../common/cache/cache.service.js";
import { PROJECTS_CACHE_KEY_ALL } from "../projects/projects-cache-keys.js";
import { RevisionsService } from "../revisions/revisions.service.js";
import type { CreateDiagramDto, UpdateDiagramDto } from "./dto/upsert-diagram.dto.js";

type DiagramRow = typeof schema.diagrams.$inferSelect;
type DiagramScalarFields = Pick<DiagramRow, "nodes" | "edges" | "groups" | "textEquivalent">;

/** Shape of `diagrams.draftData` — see the field's comment in db/schema/index.ts. */
type DiagramDraftData = Partial<DiagramScalarFields>;

/**
 * Diagrams have no `status` column (unlike Project/Post) — whether a
 * diagram is "in draft" or "published" is `publishedVersion === null`
 * vs. not, per the table's own comment. This is the same draftData
 * mechanism either way, just gated on a different column.
 */
const isPublished = (row: DiagramRow) => row.publishedVersion !== null;

@Injectable()
export class DiagramsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
    private readonly revisions: RevisionsService,
  ) {}

  private buildEffective(row: DiagramRow): DiagramScalarFields {
    const draft = (row.draftData as DiagramDraftData | null) ?? {};
    return {
      nodes: draft.nodes ?? row.nodes,
      edges: draft.edges ?? row.edges,
      groups: draft.groups ?? row.groups,
      textEquivalent: draft.textEquivalent ?? row.textEquivalent,
    };
  }

  private toAdminView(row: DiagramRow) {
    return {
      id: row.id,
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      schemaVersion: row.schemaVersion,
      version: row.version,
      publishedVersion: row.publishedVersion,
      hasPendingDraft: row.draftData !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...this.buildEffective(row),
    };
  }

  /**
   * `id` is unused by buildTextEquivalent — it only reads nodes/edges —
   * so a placeholder is fine here; the real row id doesn't exist yet
   * before insert, and isn't worth threading through for a value that
   * never affects the computed result.
   */
  private computeTextEquivalent(nodes: DiagramDoc["nodes"], edges: DiagramDoc["edges"], groups?: DiagramDoc["groups"]) {
    return buildTextEquivalent({ id: "unused", schemaVersion: 1, nodes, edges, groups });
  }

  async listForAdmin() {
    return this.db.query.diagrams.findMany({ orderBy: [asc(schema.diagrams.ownerType), asc(schema.diagrams.ownerId)] });
  }

  async getForAdmin(id: string) {
    const row = await this.db.query.diagrams.findFirst({ where: eq(schema.diagrams.id, id) });
    if (!row) throw new NotFoundException(`Diagram "${id}" not found.`);
    return this.toAdminView(row);
  }

  async create(dto: CreateDiagramDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      if (dto.ownerType === "project") {
        const owner = await tx.query.projects.findFirst({ where: eq(schema.projects.id, dto.ownerId) });
        if (!owner) throw new NotFoundException(`Project "${dto.ownerId}" not found.`);
      }

      const textEquivalent = this.computeTextEquivalent(dto.nodes, dto.edges, dto.groups);

      let row: DiagramRow | undefined;
      try {
        [row] = await tx
          .insert(schema.diagrams)
          .values({
            ownerType: dto.ownerType,
            ownerId: dto.ownerId,
            schemaVersion: 1,
            nodes: dto.nodes,
            edges: dto.edges,
            groups: dto.groups ?? null,
            textEquivalent,
            version: 1,
          })
          .returning();
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`A diagram already exists for this ${dto.ownerType} owner.`);
        throw err;
      }
      if (!row) throw new Error("Diagram insert returned no row");

      await this.revisions.record(tx, "diagram", row.id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }

  async update(id: string, dto: UpdateDiagramDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.diagrams.findFirst({ where: eq(schema.diagrams.id, id) });
      if (!existing) throw new NotFoundException(`Diagram "${id}" not found.`);

      const textEquivalent = this.computeTextEquivalent(dto.nodes, dto.edges, dto.groups);
      const nextVersion = existing.version + 1;

      let row: DiagramRow | undefined;
      if (!isPublished(existing)) {
        [row] = await tx
          .update(schema.diagrams)
          .set({
            nodes: dto.nodes,
            edges: dto.edges,
            groups: dto.groups ?? null,
            textEquivalent,
            version: nextVersion,
            updatedAt: new Date(),
          })
          .where(eq(schema.diagrams.id, id))
          .returning();
      } else {
        // Published: stage into draftData, never touch the live
        // nodes/edges/groups/textEquivalent columns. `version` still
        // advances on every save regardless (the table's own comment)
        // — it's a save counter, not "content," so it's never staged.
        const nextDraftData: DiagramDraftData = {
          ...((existing.draftData as DiagramDraftData | null) ?? {}),
          nodes: dto.nodes,
          edges: dto.edges,
          groups: dto.groups ?? null,
          textEquivalent,
        };
        [row] = await tx
          .update(schema.diagrams)
          .set({ draftData: nextDraftData, version: nextVersion, updatedAt: new Date() })
          .where(eq(schema.diagrams.id, id))
          .returning();
      }
      if (!row) throw new Error("Diagram update returned no row");

      await this.revisions.record(tx, "diagram", id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }

  /**
   * Copies draftData onto the live nodes/edges/groups/textEquivalent
   * columns (if anything is staged) and sets publishedVersion to the
   * row's current `version` — the version number whose content just
   * went live, per the table's own comment. Does NOT increment
   * `version` itself; publishing promotes an already-saved version, it
   * isn't a new save.
   */
  async publish(id: string, authorId: string) {
    const row = await this.db.transaction(async (tx) => {
      const diagram = await tx.query.diagrams.findFirst({ where: eq(schema.diagrams.id, id) });
      if (!diagram) throw new NotFoundException(`Diagram "${id}" not found.`);

      const draft = (diagram.draftData as DiagramDraftData | null) ?? null;
      const [row] = await tx
        .update(schema.diagrams)
        .set({
          nodes: draft?.nodes ?? diagram.nodes,
          edges: draft?.edges ?? diagram.edges,
          groups: draft?.groups ?? diagram.groups,
          textEquivalent: draft?.textEquivalent ?? diagram.textEquivalent,
          publishedVersion: diagram.version,
          draftData: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.diagrams.id, id))
        .returning();
      if (!row) throw new Error("Diagram publish returned no row");

      await this.revisions.record(tx, "diagram", id, this.buildEffective(row), authorId);
      return row;
    });

    // After commit — see ProjectsService.publish's identical rationale.
    if (row.ownerType === "project") await this.cache.invalidate(PROJECTS_CACHE_KEY_ALL);
    return this.toAdminView(row);
  }

  async delete(id: string) {
    const [row] = await this.db.delete(schema.diagrams).where(eq(schema.diagrams.id, id)).returning();
    if (!row) throw new NotFoundException(`Diagram "${id}" not found.`);
    if (row.ownerType === "project" && row.publishedVersion !== null) {
      await this.cache.invalidate(PROJECTS_CACHE_KEY_ALL);
    }
  }

  /**
   * Dispatched from RevisionsController for entityType "diagram" — same
   * draft-vs-published branching as update(), sourced from a past
   * revision's snapshot instead of a fresh DTO. textEquivalent is
   * recomputed from the snapshot's nodes/edges rather than trusted
   * as-stored, cheap to redo and avoids ever persisting a stale derived
   * value.
   */
  async restoreFromRevision(revision: { entityId: string; snapshot: unknown }, authorId: string) {
    const snapshot = revision.snapshot as DiagramScalarFields;

    return this.db.transaction(async (tx) => {
      const diagram = await tx.query.diagrams.findFirst({ where: eq(schema.diagrams.id, revision.entityId) });
      if (!diagram) throw new NotFoundException(`Diagram "${revision.entityId}" no longer exists.`);

      const textEquivalent = this.computeTextEquivalent(
        snapshot.nodes as DiagramDoc["nodes"],
        snapshot.edges as DiagramDoc["edges"],
        snapshot.groups as DiagramDoc["groups"],
      );
      const nextVersion = diagram.version + 1;

      let row: DiagramRow | undefined;
      if (!isPublished(diagram)) {
        [row] = await tx
          .update(schema.diagrams)
          .set({ nodes: snapshot.nodes, edges: snapshot.edges, groups: snapshot.groups, textEquivalent, version: nextVersion, updatedAt: new Date() })
          .where(eq(schema.diagrams.id, diagram.id))
          .returning();
      } else {
        const nextDraftData: DiagramDraftData = {
          ...((diagram.draftData as DiagramDraftData | null) ?? {}),
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          groups: snapshot.groups,
          textEquivalent,
        };
        [row] = await tx
          .update(schema.diagrams)
          .set({ draftData: nextDraftData, version: nextVersion, updatedAt: new Date() })
          .where(eq(schema.diagrams.id, diagram.id))
          .returning();
      }
      if (!row) throw new Error("Diagram restore returned no row");

      await this.revisions.record(tx, "diagram", diagram.id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }
}
