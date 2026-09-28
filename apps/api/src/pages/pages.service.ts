import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { pageSchema, type Page } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { CacheService } from "../common/cache/cache.service.js";

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
}
