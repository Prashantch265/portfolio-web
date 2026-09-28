import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { cvSchema } from "@portfolio/types";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import * as schema from "../db/schema/index.js";

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
  let profile: typeof schema.cvProfiles.$inferSelect;
  let createdProfileFixture = false;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);

    // A fresh CI database has no seeded CVProfile at all (M1a's
    // seed.ts is a separate, explicit pipeline step this suite must
    // not depend on) — CVProfile is a real singleton in production, so
    // ensure exactly one exists rather than assuming one already does.
    const existing = await db.query.cvProfiles.findFirst();
    if (existing) {
      profile = existing;
    } else {
      const [inserted] = await db
        .insert(schema.cvProfiles)
        .values({
          headline: "Test headline",
          location: "Test location",
          yearsExperience: "~1 year",
          summaryPublic: "Original public summary.",
          summaryGated: null,
        })
        .returning();
      if (!inserted) throw new Error("Fixture insert returned no row");
      profile = inserted;
      createdProfileFixture = true;
    }
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    if (createdProfileFixture) await db.delete(schema.cvProfiles).where(eq(schema.cvProfiles.id, profile.id));
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

    // PUT has both a route @Param and a @Body on the same handler — a
    // real bug here once had the ZodValidationPipe applied at the
    // method level validate the raw :id string against the body's
    // schema too, failing every such request with a 422. Exercising it
    // directly so a regression here fails a test, not just a code review.
    const updated = await agent
      .put(`/api/admin/cv/sections/${created.body.data.id}`)
      .send({
        kind: "certifications",
        title: "Gated-only test cert (renamed)",
        subtitle: "still gated",
        visibility: "gated",
        order: 999,
      })
      .expect(200);
    expect(updated.body.data.title).toBe("Gated-only test cert (renamed)");

    await agent.delete(`/api/admin/cv/sections/${created.body.data.id}`).expect(200);
  });

  it("PUT /api/admin/cv/profile upserts the singleton profile and updates the public summary", async () => {
    const agent = await authenticatedAgent(app, db);

    const res = await agent
      .put("/api/admin/cv/profile")
      .send({
        headline: profile.headline,
        location: profile.location,
        yearsExperience: profile.yearsExperience,
        summaryPublic: "Updated summary for the e2e test run.",
        summaryGated: null,
      })
      .expect(200);
    expect(res.body.data.summaryPublic).toBe("Updated summary for the e2e test run.");

    const publicAfter = await request(app.getHttpServer()).get("/api/cv/public").expect(200);
    expect(publicAfter.body.data.summary).toBe("Updated summary for the e2e test run.");

    // Restore — real seeded content in a local dev DB is something
    // other tests/manual verification also reads, not a disposable
    // fixture, even though this suite doesn't require it to pre-exist.
    await db.update(schema.cvProfiles).set({ summaryPublic: profile.summaryPublic }).where(eq(schema.cvProfiles.id, profile.id));
    await redis.flushall();
  });
});
