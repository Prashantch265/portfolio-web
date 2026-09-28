import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { projectSchema } from "@portfolio/types";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertProjectWithSections, cleanupBySlugPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import * as schema from "../db/schema/index.js";

const TEST_SLUG_PREFIX = "test-project-";

describe("Projects (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
  });

  beforeEach(async () => {
    // Cache is keyed on "all published projects" as one blob — a fixture
    // inserted mid-suite is invisible to a later request until the
    // cache is cleared, and a stale hit would make the draft-exclusion
    // assertion below pass for the wrong reason (a cache miss that
    // happens to predate the draft row, not a real query-level filter).
    await redis.flushall();
  });

  afterAll(async () => {
    await cleanupBySlugPrefix(db, schema.projects, TEST_SLUG_PREFIX);
    await app.close();
  });

  it("GET /api/projects returns the envelope shape and every item matches the shared Project schema", async () => {
    const res = await request(app.getHttpServer()).get("/api/projects").expect(200);
    expect(res.body).toMatchObject({ success: true, message: expect.any(String) });
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const project of res.body.data) {
      expect(projectSchema.safeParse(project).success).toBe(true);
    }
  });

  it("GET /api/projects/:slug 404s with the standard error envelope for an unknown slug", async () => {
    const res = await request(app.getHttpServer()).get("/api/projects/does-not-exist").expect(404);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 404,
      correlationId: expect.any(String),
    });
  });

  it("never returns a draft project from the list or the single-item route", async () => {
    const draft = await insertProjectWithSections(db, {
      slug: `${TEST_SLUG_PREFIX}draft`,
      status: "draft",
    });

    const list = await request(app.getHttpServer()).get("/api/projects").expect(200);
    expect(list.body.data.some((p: { slug: string }) => p.slug === draft.slug)).toBe(false);

    await request(app.getHttpServer()).get(`/api/projects/${draft.slug}`).expect(404);
  });

  it("a published fixture project appears in the list once inserted, matching the schema", async () => {
    const published = await insertProjectWithSections(db, {
      slug: `${TEST_SLUG_PREFIX}published`,
      status: "published",
      featured: true,
    });

    const res = await request(app.getHttpServer()).get("/api/projects?featured=true").expect(200);
    const found = res.body.data.find((p: { slug: string }) => p.slug === published.slug);
    expect(found).toBeDefined();
    expect(projectSchema.safeParse(found).success).toBe(true);
    expect(found.diagram).toBeNull();
  });
});
