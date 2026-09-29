import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { postSchema } from "@portfolio/types";
import { createTestApp } from "../../test-support/create-test-app.js";
import { makePostRow, cleanupBySlugPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";

const TEST_SLUG_PREFIX = "test-post-";

describe("Posts (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await cleanupBySlugPrefix(db, schema.posts, TEST_SLUG_PREFIX);
    await app.close();
  });

  it("GET /api/posts returns a cursor-paginated envelope and every item matches the shared Post schema", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts?limit=2").expect(200);
    expect(res.body).toMatchObject({ success: true, meta: { hasMore: expect.any(Boolean) } });
    for (const post of res.body.data) {
      expect(postSchema.safeParse(post).success).toBe(true);
    }
  });

  it("paginates without repeating or skipping items across pages", async () => {
    // Two fixture rows, not ambient seed data — a fresh CI database has
    // no seeded posts at all (only apps/api/src/db/seed.ts populates
    // those, and that's a separate, explicit pipeline step this test
    // must not depend on). Dated far in the future so they always sort
    // first regardless of whatever else is published, in any environment.
    const [newer, older] = await Promise.all([
      db
        .insert(schema.posts)
        .values(makePostRow({ slug: `${TEST_SLUG_PREFIX}page-a`, publishedAt: new Date("2099-01-02") }))
        .returning(),
      db
        .insert(schema.posts)
        .values(makePostRow({ slug: `${TEST_SLUG_PREFIX}page-b`, publishedAt: new Date("2099-01-01") }))
        .returning(),
    ]);
    if (!newer[0] || !older[0]) throw new Error("Fixture insert returned no row");

    const page1 = await request(app.getHttpServer()).get("/api/posts?limit=1").expect(200);
    expect(page1.body.data[0].slug).toBe(newer[0].slug);
    expect(page1.body.meta.hasMore).toBe(true);
    expect(page1.body.meta.nextCursor).toBeTypeOf("string");

    const page2 = await request(app.getHttpServer())
      .get(`/api/posts?limit=1&cursor=${page1.body.meta.nextCursor}`)
      .expect(200);

    expect(page2.body.data[0].slug).toBe(older[0].slug);
    expect(page2.body.data[0].slug).not.toBe(page1.body.data[0].slug);
  });

  it("rejects a malformed cursor with a 422 and a structured validation source", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts?cursor=not-base64url-json").expect(422);
    expect(res.body).toMatchObject({ success: false, statusCode: 422, source: { cursor: expect.any(Array) } });
  });

  it("never returns a draft post from the list or the single-item route", async () => {
    const [draft] = await db
      .insert(schema.posts)
      .values(makePostRow({ slug: `${TEST_SLUG_PREFIX}draft`, status: "draft" }))
      .returning();
    if (!draft) throw new Error("Fixture insert returned no row");

    const list = await request(app.getHttpServer()).get("/api/posts?limit=50").expect(200);
    expect(list.body.data.some((p: { slug: string }) => p.slug === draft.slug)).toBe(false);

    await request(app.getHttpServer()).get(`/api/posts/${draft.slug}`).expect(404);
  });
});
