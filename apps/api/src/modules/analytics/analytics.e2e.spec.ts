import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { like } from "drizzle-orm";
import { createTestApp } from "../../test-support/create-test-app.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";

const TEST_PATH_PREFIX = "/test-analytics-";
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test Browser";

function testPath() {
  return `${TEST_PATH_PREFIX}${crypto.randomUUID()}`;
}

describe("Analytics ingest (e2e)", () => {
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
    await db.delete(schema.analyticsEvents).where(like(schema.analyticsEvents.path, `${TEST_PATH_PREFIX}%`));
    await app.close();
  });

  it("accepts and stores a well-formed event from a real browser UA", async () => {
    const path = testPath();
    const res = await request(app.getHttpServer())
      .post("/api/analytics/event")
      .set("User-Agent", BROWSER_UA)
      .send({ type: "pageview", path })
      .expect(200);
    expect(res.body.data.accepted).toBe(true);

    const rows = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sessionHash).not.toMatch(/127\.0\.0\.1|::1/);
  });

  it("looks like success but drops an out-of-taxonomy type", async () => {
    const path = testPath();
    await request(app.getHttpServer())
      .post("/api/analytics/event")
      .set("User-Agent", BROWSER_UA)
      .send({ type: "not-a-real-type", path })
      .expect(200);

    const rows = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rows).toHaveLength(0);
  });

  it("looks like success but drops a malformed body", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/analytics/event")
      .set("User-Agent", BROWSER_UA)
      .send({ garbage: true });
    expect(res.status).toBe(200);
  });

  it("drops a known-bot user agent without storing anything", async () => {
    const path = testPath();
    await request(app.getHttpServer())
      .post("/api/analytics/event")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
      .send({ type: "pageview", path })
      .expect(200);

    const rows = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rows).toHaveLength(0);
  });

  it("drops a request with no user agent at all", async () => {
    const path = testPath();
    await request(app.getHttpServer()).post("/api/analytics/event").send({ type: "pageview", path }).expect(200);

    const rows = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rows).toHaveLength(0);
  });

  it("caps events per session within the flooding window", async () => {
    const path = testPath();
    const agent = request.agent(app.getHttpServer());
    for (let i = 0; i < 61; i++) {
      await agent.post("/api/analytics/event").set("User-Agent", BROWSER_UA).send({ type: "pageview", path }).expect(200);
    }

    const rows = await db.query.analyticsEvents.findMany({ where: (t, { eq }) => eq(t.path, path) });
    expect(rows.length).toBe(60);
  });
});
