import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { pageSchema, type Page } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { CacheService } from "../common/cache/cache.service.js";
import { ConflictException, NotFoundException } from "../common/exceptions/exceptions.js";
import { isUniqueViolation } from "../common/db/is-unique-violation.js";
import type { UpsertPageDto } from "./dto/upsert-page.dto.js";

const CACHE_TTL_SECONDS = 60;

/**
 * No draft/publish state to enforce here (backend PRD §4 — Page
 * "admin publishes directly"). Zero rows exist today (now/uses/
 * credentials have no authored content yet), so every call to this
 * currently 404s honestly rather than serving fabricated copy.
 */
@Injectable()
export class PagesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
  ) {}

  async getPage(slug: string): Promise<Page | null> {
    const cacheKey = `content:pages:${slug}`;
    return this.cache.wrap(cacheKey, CACHE_TTL_SECONDS, async () => {
      const row = await this.db.query.pages.findFirst({ where: eq(schema.pages.slug, slug) });
      if (!row) return null;
      return pageSchema.parse({
        slug: row.slug,
        title: row.title,
        body: row.body,
        updatedAt: row.updatedAt.toISOString(),
      });
    });
  }

  async listForAdmin() {
    return this.db.query.pages.findMany({ orderBy: asc(schema.pages.slug) });
  }

  async create(dto: UpsertPageDto) {
    try {
      const [row] = await this.db.insert(schema.pages).values(dto).returning();
      if (!row) throw new Error("Page insert returned no row");
      await this.cache.invalidate(`content:pages:${row.slug}`);
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Page "${dto.slug}" already exists.`);
      throw err;
    }
  }

  /** "Admin publishes directly" (PRD §4) — every write here takes effect immediately, no draft state to stage into. */
  async update(id: string, dto: UpsertPageDto) {
    const existing = await this.db.query.pages.findFirst({ where: eq(schema.pages.id, id) });
    if (!existing) throw new NotFoundException(`Page "${id}" not found.`);

    try {
      const [row] = await this.db
        .update(schema.pages)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(schema.pages.id, id))
        .returning();
      if (!row) throw new Error("Page update returned no row");
      // Invalidate both the old and new slug's cache key — a rename
      // must not leave a stale entry reachable under its former slug.
      await this.cache.invalidate(`content:pages:${existing.slug}`, `content:pages:${row.slug}`);
      return row;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(`Page "${dto.slug}" already exists.`);
      throw err;
    }
  }

  async delete(id: string) {
    const [row] = await this.db.delete(schema.pages).where(eq(schema.pages.id, id)).returning();
    if (!row) throw new NotFoundException(`Page "${id}" not found.`);
    await this.cache.invalidate(`content:pages:${row.slug}`);
  }
}
