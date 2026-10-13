import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix, cleanupContactMessagesByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";

const TEST_ADMIN_EMAIL_PREFIX = "test-admin-contact-";
const TEST_MESSAGE_EMAIL_PREFIX = "test-contact-admin-";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_ADMIN_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

async function insertMessageFixture(db: DrizzleDb) {
  const [row] = await db
    .insert(schema.contactMessages)
    .values({
      name: "Fixture Sender",
      email: `${TEST_MESSAGE_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`,
      message: "Fixture message body.",
      ipHash: "fixture-hash",
    })
    .returning();
  if (!row) throw new Error("Fixture insert returned no row");
  return row;
}

describe("Contact admin (e2e)", () => {
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
    await cleanupAdminByEmailPrefix(db, TEST_ADMIN_EMAIL_PREFIX);
    await cleanupContactMessagesByEmailPrefix(db, TEST_MESSAGE_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin contact route", async () => {
    await request(app.getHttpServer()).get("/api/admin/contact").expect(401);
    await request(app.getHttpServer()).post("/api/admin/contact/00000000-0000-0000-0000-000000000000/archive").expect(401);
  });

  it("lists messages and transitions status through read/archive/mark-spam", async () => {
    const agent = await authenticatedAgent(app, db);
    const fixture = await insertMessageFixture(db);

    const list = await agent.get("/api/admin/contact").expect(200);
    expect(list.body.data.some((m: { id: string }) => m.id === fixture.id)).toBe(true);

    const read = await agent.post(`/api/admin/contact/${fixture.id}/mark-read`).expect(201);
    expect(read.body.data.status).toBe("read");

    const archived = await agent.post(`/api/admin/contact/${fixture.id}/archive`).expect(201);
    expect(archived.body.data.status).toBe("archived");

    const spam = await agent.post(`/api/admin/contact/${fixture.id}/mark-spam`).expect(201);
    expect(spam.body.data.status).toBe("spam");
  });

  it("404s on an unknown message id", async () => {
    const agent = await authenticatedAgent(app, db);
    await agent.post("/api/admin/contact/00000000-0000-0000-0000-000000000000/archive").expect(404);
  });
});
