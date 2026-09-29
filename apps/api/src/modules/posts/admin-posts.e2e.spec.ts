import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { postSchema } from "@portfolio/types";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix, cleanupBySlugPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";

const TEST_EMAIL_PREFIX = "test-admin-posts-";
const TEST_SLUG_PREFIX = "test-admin-post-";

describe("Posts admin (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  const adminIds: string[] = [];

  async function authenticatedAgent() {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
    adminIds.push(admin.id);
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    const code = authenticator.generate(admin.totpSecret);
    await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
    return agent;
  }

  function draftPayload(slug: string, overrides: Record<string, unknown> = {}) {
    return {
      slug,
      title: "Draft title",
      summary: "Summary.",
      body: null,
      tags: ["test"],
      readingMinutes: 3,
      ...overrides,
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    for (const authorId of adminIds) {
      await db.delete(schema.revisions).where(eq(schema.revisions.authorId, authorId));
    }
    await cleanupBySlugPrefix(db, schema.posts, TEST_SLUG_PREFIX);
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin post route", async () => {
    await request(app.getHttpServer()).get("/api/admin/posts").expect(401);
    await request(app.getHttpServer()).post("/api/admin/posts").send({}).expect(401);
  });

  it("creates a draft, edits it directly, then publishes it so it becomes publicly visible", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent.post("/api/admin/posts").send(draftPayload(slug)).expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data.status).toBe("draft");
    expect(created.body.data.hasPendingDraft).toBe(false);

    await request(app.getHttpServer()).get(`/api/posts/${slug}`).expect(404);

    await agent.post(`/api/admin/posts/${id}/publish`).expect(201);

    const publicRes = await request(app.getHttpServer()).get(`/api/posts/${slug}`).expect(200);
    expect(postSchema.safeParse(publicRes.body.data).success).toBe(true);
    expect(publicRes.body.data.title).toBe("Draft title");

    // The public list is cache-keyed per limit/cursor combination —
    // publish must invalidate all of them (CacheService.invalidatePattern),
    // not just the single-item cache key, or a previously-warmed list
    // page would keep hiding a just-published post for a full TTL.
    await request(app.getHttpServer()).get("/api/posts").expect(200); // warm the list cache
    await agent.post(`/api/admin/posts/${id}/publish`).expect(201); // republish (no-op content change, re-invalidates)
    const list = await request(app.getHttpServer()).get("/api/posts?limit=50").expect(200);
    expect(list.body.data.some((p: { slug: string }) => p.slug === slug)).toBe(true);
  });

  it("stages an edit to a published post in draftData — public read is unaffected until publish", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent.post("/api/admin/posts").send(draftPayload(slug)).expect(201);
    const id = created.body.data.id as string;
    await agent.post(`/api/admin/posts/${id}/publish`).expect(201);

    const updated = await agent.put(`/api/admin/posts/${id}`).send(draftPayload(slug, { title: "Edited title" })).expect(200);
    expect(updated.body.data.hasPendingDraft).toBe(true);
    expect(updated.body.data.title).toBe("Edited title");

    const stillOld = await request(app.getHttpServer()).get(`/api/posts/${slug}`).expect(200);
    expect(stillOld.body.data.title).toBe("Draft title");

    await agent.post(`/api/admin/posts/${id}/publish`).expect(201);
    const nowNew = await request(app.getHttpServer()).get(`/api/posts/${slug}`).expect(200);
    expect(nowNew.body.data.title).toBe("Edited title");
  });

  it("rejects a duplicate slug with a 409 on create", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    await agent.post("/api/admin/posts").send(draftPayload(slug)).expect(201);

    const duplicate = await agent.post("/api/admin/posts").send(draftPayload(slug));
    expect(duplicate.status).toBe(409);
  });

  it("restores an earlier revision into draftData on a published post", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent.post("/api/admin/posts").send(draftPayload(slug)).expect(201);
    const id = created.body.data.id as string;
    await agent.post(`/api/admin/posts/${id}/publish`).expect(201);

    const revisions = await agent.get(`/api/admin/revisions?entityType=post&entityId=${id}`).expect(200);
    const originalRevisionId = revisions.body.data[0].id as string;

    await agent.put(`/api/admin/posts/${id}`).send(draftPayload(slug, { title: "Changed after the revision we'll restore" })).expect(200);

    const restored = await agent.post(`/api/admin/revisions/${originalRevisionId}/restore`).expect(201);
    expect(restored.body.data.title).toBe("Draft title");
    expect(restored.body.data.hasPendingDraft).toBe(true);

    const stillLive = await request(app.getHttpServer()).get(`/api/posts/${slug}`).expect(200);
    expect(stillLive.body.data.title).toBe("Draft title");
  });

  it("deletes a post", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent.post("/api/admin/posts").send(draftPayload(slug)).expect(201);
    const id = created.body.data.id as string;

    await agent.delete(`/api/admin/posts/${id}`).expect(200);
    await agent.get(`/api/admin/posts/${id}`).expect(404);
  });
});
