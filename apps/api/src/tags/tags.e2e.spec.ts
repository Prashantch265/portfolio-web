import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";

const TEST_EMAIL_PREFIX = "test-admin-tags-";
const TEST_LABEL = "e2e-test-tag-label";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

describe("Tags admin (e2e)", () => {
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

  it("requires a session for every admin tag route", async () => {
    await request(app.getHttpServer()).get("/api/admin/tags").expect(401);
    await request(app.getHttpServer()).post("/api/admin/tags").send({ label: "x", kind: "post" }).expect(401);
  });

  it("creates, lists, updates, and deletes a tag", async () => {
    const agent = await authenticatedAgent(app, db);

    const created = await agent.post("/api/admin/tags").send({ label: TEST_LABEL, kind: "post" }).expect(201);
    expect(created.body.data.label).toBe(TEST_LABEL);

    const list = await agent.get("/api/admin/tags").expect(200);
    expect(list.body.data.some((t: { id: string }) => t.id === created.body.data.id)).toBe(true);

    const updated = await agent
      .put(`/api/admin/tags/${created.body.data.id}`)
      .send({ label: `${TEST_LABEL}-renamed`, kind: "post" })
      .expect(200);
    expect(updated.body.data.label).toBe(`${TEST_LABEL}-renamed`);

    await agent.delete(`/api/admin/tags/${created.body.data.id}`).expect(200);
    const listAfter = await agent.get("/api/admin/tags").expect(200);
    expect(listAfter.body.data.some((t: { id: string }) => t.id === created.body.data.id)).toBe(false);
  });

  it("rejects a duplicate (label, kind) pair with a 409", async () => {
    const agent = await authenticatedAgent(app, db);
    const first = await agent.post("/api/admin/tags").send({ label: TEST_LABEL, kind: "project" }).expect(201);

    const duplicate = await agent.post("/api/admin/tags").send({ label: TEST_LABEL, kind: "project" });
    expect(duplicate.status).toBe(409);

    await agent.delete(`/api/admin/tags/${first.body.data.id}`).expect(200);
  });
});
