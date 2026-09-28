import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { pageSchema } from "@portfolio/types";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";

const TEST_EMAIL_PREFIX = "test-admin-pages-";
const TEST_SLUG = "e2e-test-page";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

describe("Pages admin (e2e)", () => {
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
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin page route", async () => {
    await request(app.getHttpServer()).get("/api/admin/pages").expect(401);
  });

  it("public read 404s for an unknown slug", async () => {
    await request(app.getHttpServer()).get(`/api/pages/${TEST_SLUG}`).expect(404);
  });

  it("a page created by an admin is immediately live on the public read (no draft state), and a rename invalidates both slugs' cache", async () => {
    const agent = await authenticatedAgent(app, db);

    const created = await agent
      .post("/api/admin/pages")
      .send({ slug: TEST_SLUG, title: "Test Page", body: "Original body." })
      .expect(201);

    const publicRead = await request(app.getHttpServer()).get(`/api/pages/${TEST_SLUG}`).expect(200);
    expect(pageSchema.safeParse(publicRead.body.data).success).toBe(true);
    expect(publicRead.body.data.body).toBe("Original body.");

    // Prime the cache under the OLD slug before renaming, so this
    // actually proves the old key gets invalidated rather than just
    // never having been cached in the first place.
    const renamedSlug = `${TEST_SLUG}-renamed`;
    await agent
      .put(`/api/admin/pages/${created.body.data.id}`)
      .send({ slug: renamedSlug, title: "Test Page", body: "Updated body." })
      .expect(200);

    await request(app.getHttpServer()).get(`/api/pages/${TEST_SLUG}`).expect(404);
    const renamedRead = await request(app.getHttpServer()).get(`/api/pages/${renamedSlug}`).expect(200);
    expect(renamedRead.body.data.body).toBe("Updated body.");

    await agent.delete(`/api/admin/pages/${created.body.data.id}`).expect(200);
    await request(app.getHttpServer()).get(`/api/pages/${renamedSlug}`).expect(404);
  });
});
