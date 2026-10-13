import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../test-support/create-test-app.js";
import { cleanupContactMessagesByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";

const TEST_EMAIL_PREFIX = "test-contact-";

function validBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Jane Visitor",
    email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`,
    message: "Hello, I'd like to talk about a project.",
    formRenderedAt: new Date(Date.now() - 5000).toISOString(),
    ...overrides,
  };
}

describe("Contact (e2e)", () => {
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
    await cleanupContactMessagesByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("accepts a real submission and stores it", async () => {
    const body = validBody();
    const res = await request(app.getHttpServer()).post("/api/contact").send(body).expect(200);
    expect(res.body.data.received).toBe(true);

    const [row] = await db.query.contactMessages.findMany({ where: (t, { eq }) => eq(t.email, body.email) });
    expect(row?.message).toBe(body.message);
    expect(row?.status).toBe("new");
    // Never the raw IP, in any form, on the stored row.
    expect(row?.ipHash).not.toMatch(/127\.0\.0\.1|::1/);
  });

  it("looks like success but drops a honeypot-filled submission", async () => {
    const body = validBody({ website: "https://spam.example" });
    const res = await request(app.getHttpServer()).post("/api/contact").send(body).expect(200);
    expect(res.body.data.received).toBe(true);

    const rows = await db.query.contactMessages.findMany({ where: (t, { eq }) => eq(t.email, body.email) });
    expect(rows).toHaveLength(0);
  });

  it("looks like success but drops a too-fast submission", async () => {
    const body = validBody({ formRenderedAt: new Date().toISOString() });
    const res = await request(app.getHttpServer()).post("/api/contact").send(body).expect(200);
    expect(res.body.data.received).toBe(true);

    const rows = await db.query.contactMessages.findMany({ where: (t, { eq }) => eq(t.email, body.email) });
    expect(rows).toHaveLength(0);
  });

  it("rate-limits per IP after the configured threshold", async () => {
    const agent = request.agent(app.getHttpServer());
    for (let i = 0; i < 5; i++) {
      await agent.post("/api/contact").set("X-Forwarded-For", "9.9.9.9").send(validBody()).expect(200);
    }
    const res = await agent.post("/api/contact").set("X-Forwarded-For", "9.9.9.9").send(validBody());
    expect(res.status).toBe(429);
  });

  it("rate-limits per email after the configured threshold", async () => {
    const email = `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`;
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post("/api/contact")
        .set("X-Forwarded-For", `10.0.0.${i}`)
        .send(validBody({ email }))
        .expect(200);
    }
    const res = await request(app.getHttpServer())
      .post("/api/contact")
      .set("X-Forwarded-For", "10.0.0.99")
      .send(validBody({ email }));
    expect(res.status).toBe(429);
  });

  it("rejects a malformed body with a 422", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/contact")
      .send({ name: "", email: "not-an-email", message: "", formRenderedAt: "not-a-date" });
    expect(res.status).toBe(422);
  });
});
