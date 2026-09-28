import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { postSchema, type Post } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import type { ICursorPaginatedResponse } from "../common/interfaces/response.interface.js";
import { CacheService } from "../common/cache/cache.service.js";
import { decodeCursor, encodeCursor } from "./lib/cursor.js";

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class PostsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
  ) {}

  async getPosts(limit: number, cursor?: string): Promise<ICursorPaginatedResponse<Post>> {
    const cacheKey = `content:posts:list:${limit}:${cursor ?? ""}`;
    return this.cache.wrap(cacheKey, CACHE_TTL_SECONDS, async () => {
      const decoded = cursor ? decodeCursor(cursor) : null;

      const rows = await this.db.query.posts.findMany({
        where: and(
          eq(schema.posts.status, "published"),
          decoded
            ? or(
                lt(schema.posts.publishedAt, new Date(decoded.publishedAt)),
                and(eq(schema.posts.publishedAt, new Date(decoded.publishedAt)), lt(schema.posts.id, decoded.id)),
              )
            : undefined,
        ),
        orderBy: [desc(schema.posts.publishedAt), desc(schema.posts.id)],
        // Over-fetch by one to detect "is there another page" without a
        // second COUNT query — a real cursor list has no cheap total.
        limit: limit + 1,
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page.at(-1);

      const items = page.map((row) => this.toPost(row));

      return {
        items,
        meta: {
          hasMore,
          nextCursor:
            hasMore && last?.publishedAt ? encodeCursor({ publishedAt: last.publishedAt.toISOString(), id: last.id }) : null,
        },
      };
    });
  }

  async getPost(slug: string): Promise<Post | null> {
    const cacheKey = `content:posts:detail:${slug}`;
    return this.cache.wrap(cacheKey, CACHE_TTL_SECONDS, async () => {
      const row = await this.db.query.posts.findFirst({
        where: and(eq(schema.posts.slug, slug), eq(schema.posts.status, "published")),
      });
      if (!row) return null;
      return this.toPost(row);
    });
  }

  /**
   * Backs GET /api/writing/feed.xml (backend PRD §5 — "same
   * published-posts query as the index"). Not cached separately: the
   * feed is generated at most once per request from this same
   * published-only query, no different from the list endpoint's own
   * first page.
   */
  async getAllPublishedForFeed(): Promise<Post[]> {
    const rows = await this.db.query.posts.findMany({
      where: eq(schema.posts.status, "published"),
      orderBy: [desc(schema.posts.publishedAt), desc(schema.posts.id)],
    });
    return rows.map((row) => this.toPost(row));
  }

  private toPost(row: typeof schema.posts.$inferSelect): Post {
    return postSchema.parse({
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      date: row.publishedAt?.toISOString().slice(0, 10),
      readingMinutes: row.readingMinutes,
      tags: row.tags,
    });
  }
}
