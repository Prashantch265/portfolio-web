import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { like } from "drizzle-orm";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";
import { AnalyticsService } from "./analytics.service.js";

const TEST_ADMIN_EMAIL_PREFIX = "test-admin-analytics-";
const TEST_PATH_PREFIX = "/test-admin-analytics-";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_ADMIN_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

describe("Analytics admin (e2e)", () => {
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
    await db.delete(schema.analyticsEvents).where(like(schema.analyticsEvents.path, `${TEST_PATH_PREFIX}%`));
    await db.delete(schema.analyticsDailyAggregates).where(like(schema.analyticsDailyAggregates.path, `${TEST_PATH_PREFIX}%`));
    await app.close();
  });

  it("requires a session for the summary route", async () => {
    await request(app.getHttpServer()).get("/api/admin/analytics/summary").expect(401);
  });

  it("merges still-raw and already-rolled-up counts for the same path", async () => {
    const path = `${TEST_PATH_PREFIX}${crypto.randomUUID()}`;
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // well past the 90-day default retention

    // Two "old" raw events that rollupAndPurge should fold into one
    // aggregate row, plus one "recent" raw event that stays raw.
    await db.insert(schema.analyticsEvents).values([
      { type: "pageview", path, sessionHash: "fixture-a", occurredAt: oldDate },
      { type: "pageview", path, sessionHash: "fixture-b", occurredAt: oldDate },
      { type: "pageview", path, sessionHash: "fixture-c" },
    ]);

    const analyticsService = app.get(AnalyticsService);
    await analyticsService.rollupAndPurge(new Date());

    const rawRemaining = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rawRemaining).toHaveLength(1); // the two old ones were purged, the recent one wasn't

    const aggregateRows = await db.query.analyticsDailyAggregates.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(aggregateRows).toHaveLength(1);
    expect(aggregateRows[0]?.count).toBe(2);

    const agent = await authenticatedAgent(app, db);
    const res = await agent.get("/api/admin/analytics/summary").expect(200);
    const entry = res.body.data.pageviews.find((p: { path: string }) => p.path === path);
    expect(entry?.count).toBe(3); // 2 rolled-up + 1 still-raw
  });

  it("is idempotent across repeated rollup runs", async () => {
    const path = `${TEST_PATH_PREFIX}${crypto.randomUUID()}`;
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await db.insert(schema.analyticsEvents).values([{ type: "pageview", path, sessionHash: "fixture-a", occurredAt: oldDate }]);

    const analyticsService = app.get(AnalyticsService);
    await analyticsService.rollupAndPurge(new Date());
    const secondRun = await analyticsService.rollupAndPurge(new Date());
    expect(secondRun.aggregated).toBe(0); // nothing left to roll up — already purged

    const aggregateRows = await db.query.analyticsDailyAggregates.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(aggregateRows).toHaveLength(1);
    expect(aggregateRows[0]?.count).toBe(1);
  });
});
