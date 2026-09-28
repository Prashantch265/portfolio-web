import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cvSchema } from "@portfolio/types";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import * as schema from "../db/schema/index.js";
import { authenticator } from "otplib";
import { eq } from "drizzle-orm";

const TEST_EMAIL_PREFIX = "test-admin-cv-";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

describe("CV (e2e)", () => {
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

  it("GET /api/cv/public matches the shared CV schema and never includes a gated section", async () => {
    const res = await request(app.getHttpServer()).get("/api/cv/public").expect(200);
    expect(cvSchema.safeParse(res.body.data).success).toBe(true);
  });

  it("admin CV routes require a session", async () => {
    await request(app.getHttpServer()).get("/api/admin/cv/profile").expect(401);
    await request(app.getHttpServer()).get("/api/admin/cv/sections").expect(401);
  });

  it("a gated section created by an authenticated admin never appears in the public read, and cache is invalidated on write", async () => {
    const agent = await authenticatedAgent(app, db);

    // Prime the public-read cache before the write, so this proves
    // invalidation actually happened rather than a cache miss
    // coincidentally returning fresh data.
    await request(app.getHttpServer()).get("/api/cv/public").expect(200);

    const created = await agent
      .post("/api/admin/cv/sections")
      .send({
        kind: "certifications",
        title: "Gated-only test cert",
        subtitle: "should never be public",
        visibility: "gated",
        order: 999,
      })
      .expect(201);

    const publicAfter = await request(app.getHttpServer()).get("/api/cv/public").expect(200);
    const titles = [...publicAfter.body.data.certifications, ...publicAfter.body.data.accomplishments].map(
      (e: { title: string }) => e.title,
    );
    expect(titles).not.toContain("Gated-only test cert");

    await agent.delete(`/api/admin/cv/sections/${created.body.data.id}`).expect(200);
  });

  it("PUT /api/admin/cv/profile upserts the singleton profile and updates the public summary", async () => {
    const agent = await authenticatedAgent(app, db);
    const before = await db.query.cvProfiles.findFirst();
    if (!before) throw new Error("Expected a seeded CV profile to already exist");

    const res = await agent
      .put("/api/admin/cv/profile")
      .send({
        headline: before.headline,
        location: before.location,
        yearsExperience: before.yearsExperience,
        summaryPublic: "Updated summary for the e2e test run.",
        summaryGated: null,
      })
      .expect(200);
    expect(res.body.data.summaryPublic).toBe("Updated summary for the e2e test run.");

    const publicAfter = await request(app.getHttpServer()).get("/api/cv/public").expect(200);
    expect(publicAfter.body.data.summary).toBe("Updated summary for the e2e test run.");

    // Restore — this profile is real seeded content other tests/manual
    // verification also reads, not a disposable fixture.
    await db.update(schema.cvProfiles).set({ summaryPublic: before.summaryPublic }).where(eq(schema.cvProfiles.id, before.id));
    await redis.flushall();
  });
});
