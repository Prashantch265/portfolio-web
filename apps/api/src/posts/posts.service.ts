import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, lt, or } from "drizzle-orm";
import { postSchema, type Post } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import type { ICursorPaginatedResponse } from "../common/interfaces/response.interface.js";
import { ConflictException, NotFoundException } from "../common/exceptions/exceptions.js";
import { isUniqueViolation } from "../common/db/is-unique-violation.js";
import { CacheService } from "../common/cache/cache.service.js";
import { RevisionsService } from "../revisions/revisions.service.js";
import type { UpsertPostDto } from "./dto/upsert-post.dto.js";
import { decodeCursor, encodeCursor } from "./lib/cursor.js";

const CACHE_TTL_SECONDS = 60;
const CACHE_LIST_PREFIX = "content:posts:list:";
const cacheDetailKey = (slug: string) => `content:posts:detail:${slug}`;

type PostRow = typeof schema.posts.$inferSelect;
type PostScalarFields = Pick<PostRow, "slug" | "title" | "summary" | "body" | "tags" | "readingMinutes">;

/** Shape of `posts.draftData` — see the field's comment in db/schema/index.ts. */
type PostDraftData = Partial<PostScalarFields>;

@Injectable()
export class PostsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly cache: CacheService,
    private readonly revisions: RevisionsService,
  ) {}

  async getPosts(limit: number, cursor?: string): Promise<ICursorPaginatedResponse<Post>> {
    const cacheKey = `${CACHE_LIST_PREFIX}${limit}:${cursor ?? ""}`;
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
    return this.cache.wrap(cacheDetailKey(slug), CACHE_TTL_SECONDS, async () => {
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

  private toPost(row: PostRow): Post {
    return postSchema.parse({
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      date: row.publishedAt?.toISOString().slice(0, 10),
      readingMinutes: row.readingMinutes,
      tags: row.tags,
    });
  }

  // ---------------------------------------------------------------
  // Admin CRUD + draft/publish + revisions (M1d/4) — same draftData
  // mechanism as Project (see projects.service.ts's module comment),
  // simpler here since a Post has no child sections to nest under it.
  // ---------------------------------------------------------------

  private buildEffective(row: PostRow): PostScalarFields {
    const draft = (row.draftData as PostDraftData | null) ?? {};
    return {
      slug: draft.slug ?? row.slug,
      title: draft.title ?? row.title,
      summary: draft.summary ?? row.summary,
      body: draft.body ?? row.body,
      tags: draft.tags ?? row.tags,
      readingMinutes: draft.readingMinutes ?? row.readingMinutes,
    };
  }

  private toAdminView(row: PostRow) {
    return {
      id: row.id,
      status: row.status,
      publishedAt: row.publishedAt,
      hasPendingDraft: row.draftData !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...this.buildEffective(row),
    };
  }

  async listForAdmin() {
    return this.db.query.posts.findMany({ orderBy: asc(schema.posts.slug) });
  }

  async getForAdmin(id: string) {
    const row = await this.db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
    if (!row) throw new NotFoundException(`Post "${id}" not found.`);
    return this.toAdminView(row);
  }

  async create(dto: UpsertPostDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      let row: PostRow | undefined;
      try {
        [row] = await tx.insert(schema.posts).values({ ...dto, status: "draft" }).returning();
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Post "${dto.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Post insert returned no row");

      await this.revisions.record(tx, "post", row.id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }

  async update(id: string, dto: UpsertPostDto, authorId: string) {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.posts.findFirst({ where: eq(schema.posts.id, id) });
      if (!existing) throw new NotFoundException(`Post "${id}" not found.`);

      let row: PostRow | undefined;
      try {
        if (existing.status === "draft") {
          [row] = await tx
            .update(schema.posts)
            .set({ ...dto, updatedAt: new Date() })
            .where(eq(schema.posts.id, id))
            .returning();
        } else {
          // Published: stage into draftData, never touch the live
          // columns. A colliding slug only surfaces at publish() time.
          const nextDraftData: PostDraftData = { ...((existing.draftData as PostDraftData | null) ?? {}), ...dto };
          [row] = await tx
            .update(schema.posts)
            .set({ draftData: nextDraftData, updatedAt: new Date() })
            .where(eq(schema.posts.id, id))
            .returning();
        }
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Post "${dto.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Post update returned no row");

      await this.revisions.record(tx, "post", id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }

  async publish(id: string, authorId: string) {
    const liveRow = await this.db.transaction(async (tx) => {
      const post = await tx.query.posts.findFirst({ where: eq(schema.posts.id, id) });
      if (!post) throw new NotFoundException(`Post "${id}" not found.`);

      const draft = (post.draftData as PostDraftData | null) ?? null;
      const now = new Date();

      let liveRow: PostRow;
      try {
        const [row] = await tx
          .update(schema.posts)
          .set({
            slug: draft?.slug ?? post.slug,
            title: draft?.title ?? post.title,
            summary: draft?.summary ?? post.summary,
            body: draft?.body ?? post.body,
            tags: draft?.tags ?? post.tags,
            readingMinutes: draft?.readingMinutes ?? post.readingMinutes,
            status: "published",
            publishedAt: now,
            draftData: null,
            updatedAt: now,
          })
          .where(eq(schema.posts.id, id))
          .returning();
        if (!row) throw new Error("Post publish returned no row");
        liveRow = row;
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Post "${draft?.slug ?? post.slug}" already exists.`);
        throw err;
      }

      await this.revisions.record(tx, "post", id, this.buildEffective(liveRow), authorId);
      return liveRow;
    });

    // After commit, not from inside the transaction — see
    // ProjectsService.publish's identical rationale.
    await this.cache.invalidatePattern(CACHE_LIST_PREFIX);
    await this.cache.invalidate(cacheDetailKey(liveRow.slug));
    return this.toAdminView(liveRow);
  }

  async delete(id: string) {
    const [row] = await this.db.delete(schema.posts).where(eq(schema.posts.id, id)).returning();
    if (!row) throw new NotFoundException(`Post "${id}" not found.`);
    if (row.status === "published") {
      await this.cache.invalidatePattern(CACHE_LIST_PREFIX);
      await this.cache.invalidate(cacheDetailKey(row.slug));
    }
  }

  /**
   * Dispatched from RevisionsController for entityType "post" — same
   * draft-vs-published branching as update() above.
   */
  async restoreFromRevision(revision: { entityId: string; snapshot: unknown }, authorId: string) {
    const snapshot = revision.snapshot as PostScalarFields;

    return this.db.transaction(async (tx) => {
      const post = await tx.query.posts.findFirst({ where: eq(schema.posts.id, revision.entityId) });
      if (!post) throw new NotFoundException(`Post "${revision.entityId}" no longer exists.`);

      let row: PostRow | undefined;
      try {
        if (post.status === "draft") {
          [row] = await tx
            .update(schema.posts)
            .set({ ...snapshot, updatedAt: new Date() })
            .where(eq(schema.posts.id, post.id))
            .returning();
        } else {
          const nextDraftData: PostDraftData = { ...((post.draftData as PostDraftData | null) ?? {}), ...snapshot };
          [row] = await tx
            .update(schema.posts)
            .set({ draftData: nextDraftData, updatedAt: new Date() })
            .where(eq(schema.posts.id, post.id))
            .returning();
        }
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictException(`Post "${snapshot.slug}" already exists.`);
        throw err;
      }
      if (!row) throw new Error("Post restore returned no row");

      await this.revisions.record(tx, "post", post.id, this.buildEffective(row), authorId);
      return this.toAdminView(row);
    });
  }
}
