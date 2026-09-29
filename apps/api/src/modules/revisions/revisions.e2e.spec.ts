import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { eq } from "drizzle-orm";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";

const TEST_EMAIL_PREFIX = "test-admin-revisions-";

describe("Revisions admin (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  let seedAdminId: string;
  const entityId = crypto.randomUUID();

  // Authenticates AFTER the current test's beforeEach has already
  // flushed Redis — logging in during beforeAll instead would create a
  // session that every subsequent beforeEach's flush then destroys
  // (sessions are Redis-backed), a real bug this file hit once already.
  async function authenticatedAgent() {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    const code = authenticator.generate(admin.totpSecret);
    await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
    return agent;
  }

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);

    const seedAdmin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}seed-${crypto.randomUUID()}@example.com` });
    seedAdminId = seedAdmin.id;

    // Seeded directly to prove the list/filter query itself (this
    // suite predates any real entity writer calling
    // RevisionsService.record()). `createdAt` is set explicitly and
    // spread apart — Postgres's `now()`/defaultNow() is transaction-
    // start time, so a single multi-row INSERT (or any two rows
    // committed within the same clock tick) can land with IDENTICAL
    // timestamps, making "newest first" ordering nondeterministic. A
    // real caller never inserts two revisions in one statement
    // (RevisionsService.record() writes exactly one row per
    // transaction), so this is a test-fixture-only hazard — see
    // GOTCHA.md.
    const base = Date.now();
    await db.insert(schema.revisions).values([
      { entityType: "project", entityId, snapshot: { title: "v1" }, authorId: seedAdminId, createdAt: new Date(base) },
      { entityType: "project", entityId, snapshot: { title: "v2" }, authorId: seedAdminId, createdAt: new Date(base + 1000) },
      {
        entityType: "post",
        entityId: crypto.randomUUID(),
        snapshot: { title: "unrelated" },
        authorId: seedAdminId,
        createdAt: new Date(base + 2000),
      },
    ]);
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await db.delete(schema.revisions).where(eq(schema.revisions.authorId, seedAdminId));
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session", async () => {
    await request(app.getHttpServer()).get("/api/admin/revisions").expect(401);
  });

  it("filters by entityType and entityId, newest first", async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get(`/api/admin/revisions?entityType=project&entityId=${entityId}`).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].snapshot).toEqual({ title: "v2" });
    expect(res.body.data[1].snapshot).toEqual({ title: "v1" });
    expect(res.body.data.every((r: { entityType: string }) => r.entityType === "project")).toBe(true);
  });

  it("rejects an invalid entityType with a 422", async () => {
    const agent = await authenticatedAgent();
    const res = await agent.get("/api/admin/revisions?entityType=not-a-real-type");
    expect(res.status).toBe(422);
  });
});
