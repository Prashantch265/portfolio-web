import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { projectSchema } from "@portfolio/types";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix, cleanupBySlugPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import * as schema from "../db/schema/index.js";

const TEST_EMAIL_PREFIX = "test-admin-projects-";
const TEST_SLUG_PREFIX = "test-admin-project-";

describe("Projects admin (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  const adminIds: string[] = [];

  // Per-test login (not beforeAll) — beforeEach flushes Redis, which
  // also backs the session store; a beforeAll session would be
  // destroyed by the very first flush. See GOTCHA.md.
  async function authenticatedAgent() {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
    adminIds.push(admin.id);
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    const code = authenticator.generate(admin.totpSecret);
    await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
    return agent;
  }

  const sectionBodies = {
    context: "Fixture context.",
    constraints: ["Fixture constraint."],
    decisions: [{ heading: "Fixture decision", body: "Body.", emphasis: false }],
    outcome: "Fixture outcome.",
  };

  async function createDraftWithSections(agent: ReturnType<typeof request.agent>, slug: string) {
    const created = await agent
      .post("/api/admin/projects")
      .send({ slug, title: "Draft title", kicker: "TEST", summary: "Summary.", years: "2026", stackTags: ["TestStack"] })
      .expect(201);
    const id = created.body.data.id as string;
    for (const [kind, body] of Object.entries(sectionBodies)) {
      await agent.put(`/api/admin/projects/${id}/sections/${kind}`).send({ body }).expect(200);
    }
    return id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    // FK order: revisions.authorId -> admin_users (no cascade), so
    // revisions must go before the admins that authored them; project
    // deletion cascades case_study_sections on its own.
    for (const authorId of adminIds) {
      await db.delete(schema.revisions).where(eq(schema.revisions.authorId, authorId));
    }
    await cleanupBySlugPrefix(db, schema.projects, TEST_SLUG_PREFIX);
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin project route", async () => {
    await request(app.getHttpServer()).get("/api/admin/projects").expect(401);
    await request(app.getHttpServer()).post("/api/admin/projects").send({}).expect(401);
  });

  it("creates a draft, edits it directly (no draftData), then publishes it so it becomes publicly visible", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const id = await createDraftWithSections(agent, slug);

    const afterCreate = await agent.get(`/api/admin/projects/${id}`).expect(200);
    expect(afterCreate.body.data.status).toBe("draft");
    expect(afterCreate.body.data.hasPendingDraft).toBe(false);
    expect(afterCreate.body.data.sections.context).toBe("Fixture context.");

    await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(404);

    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);

    const publicRes = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(projectSchema.safeParse(publicRes.body.data).success).toBe(true);
    expect(publicRes.body.data.title).toBe("Draft title");
  });

  it("stages an edit to a published project in draftData — public read is unaffected until publish", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const id = await createDraftWithSections(agent, slug);
    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);

    const updated = await agent
      .put(`/api/admin/projects/${id}`)
      .send({ slug, title: "Edited title", kicker: "TEST", summary: "Summary.", years: "2026", stackTags: ["TestStack"] })
      .expect(200);
    expect(updated.body.data.hasPendingDraft).toBe(true);
    expect(updated.body.data.title).toBe("Edited title");

    const stillOld = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(stillOld.body.data.title).toBe("Draft title");

    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);
    const nowNew = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(nowNew.body.data.title).toBe("Edited title");
  });

  it("stages a case-study section edit on a published project under draftData.sections — the section's own row is untouched until publish", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const id = await createDraftWithSections(agent, slug);
    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);

    await agent.put(`/api/admin/projects/${id}/sections/outcome`).send({ body: "New outcome." }).expect(200);

    const stillOld = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(stillOld.body.data.outcome).toBe("Fixture outcome.");

    const [rawSection] = await db
      .select()
      .from(schema.caseStudySections)
      .where(eq(schema.caseStudySections.projectId, id));
    expect(rawSection?.body).not.toBe("New outcome.");

    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);
    const nowNew = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(nowNew.body.data.outcome).toBe("New outcome.");
  });

  it("rejects a duplicate slug with a 409 on create", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    await agent
      .post("/api/admin/projects")
      .send({ slug, title: "First", kicker: "TEST", summary: "Summary.", years: "2026" })
      .expect(201);

    const duplicate = await agent
      .post("/api/admin/projects")
      .send({ slug, title: "Second", kicker: "TEST", summary: "Summary.", years: "2026" });
    expect(duplicate.status).toBe(409);
  });

  it("rejects an invalid section kind and a malformed section body with a 422", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent
      .post("/api/admin/projects")
      .send({ slug, title: "T", kicker: "TEST", summary: "Summary.", years: "2026" })
      .expect(201);
    const id = created.body.data.id as string;

    const badKind = await agent.put(`/api/admin/projects/${id}/sections/not-a-kind`).send({ body: "x" });
    expect(badKind.status).toBe(422);

    // "constraints" must be a non-empty string array, not a bare string.
    const badBody = await agent.put(`/api/admin/projects/${id}/sections/constraints`).send({ body: "not an array" });
    expect(badBody.status).toBe(422);
  });

  it("restores an earlier revision into draftData on a published project, and dispatches an unsupported entity type as 501", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const id = await createDraftWithSections(agent, slug);
    await agent.post(`/api/admin/projects/${id}/publish`).expect(201);

    const revisionsBeforeEdit = await agent.get(`/api/admin/revisions?entityType=project&entityId=${id}`).expect(200);
    const originalRevisionId = revisionsBeforeEdit.body.data[0].id as string;

    await agent
      .put(`/api/admin/projects/${id}`)
      .send({ slug, title: "Changed after the revision we'll restore", kicker: "TEST", summary: "Summary.", years: "2026" })
      .expect(200);

    const restored = await agent.post(`/api/admin/revisions/${originalRevisionId}/restore`).expect(201);
    expect(restored.body.data.title).toBe("Draft title");
    expect(restored.body.data.hasPendingDraft).toBe(true);

    // Still published live at the last actually-published value — neither
    // the staged edit nor the restore ever touched draftData's target,
    // the live columns, since publish was never called again.
    const stillLive = await request(app.getHttpServer()).get(`/api/projects/${slug}`).expect(200);
    expect(stillLive.body.data.title).toBe("Draft title");

    // "page" never dispatches — Page has no draft/publish/revision
    // concept at all (PRD §4: "admin publishes directly"), so it's the
    // one entityType that will never gain a real restore case. project/
    // post/diagram are all real as of M1d/3–5, so none of them can be
    // used as the unsupported-type fixture anymore.
    const [unrelatedRevision] = await db
      .insert(schema.revisions)
      .values({ entityType: "page", entityId: crypto.randomUUID(), snapshot: { title: "n/a" }, authorId: adminIds[adminIds.length - 1]! })
      .returning();
    const notImplemented = await agent.post(`/api/admin/revisions/${unrelatedRevision!.id}/restore`);
    expect(notImplemented.status).toBe(501);
  });

  it("deletes a project", async () => {
    const agent = await authenticatedAgent();
    const slug = `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`;
    const created = await agent
      .post("/api/admin/projects")
      .send({ slug, title: "T", kicker: "TEST", summary: "Summary.", years: "2026" })
      .expect(201);
    const id = created.body.data.id as string;

    await agent.delete(`/api/admin/projects/${id}`).expect(200);
    await agent.get(`/api/admin/projects/${id}`).expect(404);
  });
});
