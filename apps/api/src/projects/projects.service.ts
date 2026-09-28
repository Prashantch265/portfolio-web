import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { projectSchema, type ProjectWithNav } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { DatabaseException } from "../common/exceptions/exceptions.js";
import { CacheService } from "../common/cache/cache.service.js";

const CACHE_KEY_ALL = "content:projects:all";
const CACHE_TTL_SECONDS = 60;

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

  private async assemble(row: typeof schema.projects.$inferSelect) {
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
}
