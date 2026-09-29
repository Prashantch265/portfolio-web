import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix, insertProjectWithSections, cleanupBySlugPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import * as schema from "../db/schema/index.js";

const TEST_EMAIL_PREFIX = "test-admin-diagrams-";
const TEST_SLUG_PREFIX = "test-admin-diagram-project-";

describe("Diagrams admin (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  const adminIds: string[] = [];

  async function authenticatedAgent() {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
    adminIds.push(admin.id);
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    const code = authenticator.generate(admin.totpSecret);
    await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
    return agent;
  }

  const nodeA = { id: "a", type: "client", label: "Browser", col: 0, row: 0, annotation: { role: "Entry point", reasoning: null, alternative: null } };
  const nodeB = { id: "b", type: "service", label: "API", col: 1, row: 0, annotation: { role: "Handles requests", reasoning: null, alternative: null } };
  const edgeAB = { id: "e1", from: "a", to: "b", type: "sync" };

  async function createProjectOwner() {
    const project = await insertProjectWithSections(db, { slug: `${TEST_SLUG_PREFIX}${crypto.randomUUID()}`, status: "published" });
    return project;
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
    for (const authorId of adminIds) {
      await db.delete(schema.revisions).where(eq(schema.revisions.authorId, authorId));
    }
    await cleanupBySlugPrefix(db, schema.projects, TEST_SLUG_PREFIX);
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin diagram route", async () => {
    await request(app.getHttpServer()).get("/api/admin/diagrams").expect(401);
    await request(app.getHttpServer()).post("/api/admin/diagrams").send({}).expect(401);
  });

  it("creates a diagram for a project owner, then publishes it so it's embedded in the public project read", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();

    const created = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [nodeA, nodeB], edges: [edgeAB] })
      .expect(201);
    expect(created.body.data.version).toBe(1);
    expect(created.body.data.publishedVersion).toBeNull();
    expect(created.body.data.hasPendingDraft).toBe(false);
    const id = created.body.data.id as string;

    const beforePublish = await request(app.getHttpServer()).get(`/api/projects/${project.slug}`).expect(200);
    expect(beforePublish.body.data.diagram).toBeNull();

    await agent.post(`/api/admin/diagrams/${id}/publish`).expect(201);

    const afterPublish = await request(app.getHttpServer()).get(`/api/projects/${project.slug}`).expect(200);
    expect(afterPublish.body.data.diagram).toMatchObject({ nodes: [nodeA, nodeB], edges: [edgeAB] });
  });

  it("404s creating a diagram for a nonexistent project owner", async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: crypto.randomUUID(), nodes: [nodeA], edges: [] });
    expect(res.status).toBe(404);
  });

  it("409s creating a second diagram for the same owner", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();
    await agent.post("/api/admin/diagrams").send({ ownerType: "project", ownerId: project.id, nodes: [nodeA], edges: [] }).expect(201);

    const duplicate = await agent.post("/api/admin/diagrams").send({ ownerType: "project", ownerId: project.id, nodes: [nodeB], edges: [] });
    expect(duplicate.status).toBe(409);
  });

  it("rejects an empty node list, an edge referencing a nonexistent node id, and a type outside the taxonomy — all with field-level 422s", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();

    const emptyNodes = await agent.post("/api/admin/diagrams").send({ ownerType: "project", ownerId: project.id, nodes: [], edges: [] });
    expect(emptyNodes.status).toBe(422);
    expect(emptyNodes.body.source.nodes).toBeDefined();

    const badEdge = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [nodeA], edges: [{ id: "e1", from: "a", to: "ghost", type: "sync" }] });
    expect(badEdge.status).toBe(422);
    expect(badEdge.body.source["edges.0.to"]).toBeDefined();

    const badType = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [{ ...nodeA, type: "not-a-real-type" }], edges: [] });
    expect(badType.status).toBe(422);
  });

  it("stages an edit to a published diagram in draftData — public read is unaffected until publish", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();
    const created = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [nodeA, nodeB], edges: [edgeAB] })
      .expect(201);
    const id = created.body.data.id as string;
    await agent.post(`/api/admin/diagrams/${id}/publish`).expect(201);

    const nodeC = { ...nodeB, id: "c", label: "Edited API" };
    const updated = await agent.put(`/api/admin/diagrams/${id}`).send({ nodes: [nodeA, nodeC], edges: [] }).expect(200);
    expect(updated.body.data.hasPendingDraft).toBe(true);
    expect(updated.body.data.version).toBe(2);

    const stillOld = await request(app.getHttpServer()).get(`/api/projects/${project.slug}`).expect(200);
    expect(stillOld.body.data.diagram.nodes.map((n: { id: string }) => n.id)).toEqual(["a", "b"]);

    await agent.post(`/api/admin/diagrams/${id}/publish`).expect(201);
    const nowNew = await request(app.getHttpServer()).get(`/api/projects/${project.slug}`).expect(200);
    expect(nowNew.body.data.diagram.nodes.map((n: { id: string }) => n.id)).toEqual(["a", "c"]);
  });

  it("restores an earlier revision into draftData on a published diagram", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();
    const created = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [nodeA, nodeB], edges: [edgeAB] })
      .expect(201);
    const id = created.body.data.id as string;
    await agent.post(`/api/admin/diagrams/${id}/publish`).expect(201);

    const revisions = await agent.get(`/api/admin/revisions?entityType=diagram&entityId=${id}`).expect(200);
    const originalRevisionId = revisions.body.data[0].id as string;

    await agent.put(`/api/admin/diagrams/${id}`).send({ nodes: [nodeA], edges: [] }).expect(200);

    const restored = await agent.post(`/api/admin/revisions/${originalRevisionId}/restore`).expect(201);
    expect(restored.body.data.nodes.map((n: { id: string }) => n.id)).toEqual(["a", "b"]);
    expect(restored.body.data.hasPendingDraft).toBe(true);

    const stillLive = await request(app.getHttpServer()).get(`/api/projects/${project.slug}`).expect(200);
    expect(stillLive.body.data.diagram.nodes.map((n: { id: string }) => n.id)).toEqual(["a", "b"]);
  });

  it("deletes a diagram", async () => {
    const agent = await authenticatedAgent();
    const project = await createProjectOwner();
    const created = await agent
      .post("/api/admin/diagrams")
      .send({ ownerType: "project", ownerId: project.id, nodes: [nodeA], edges: [] })
      .expect(201);
    const id = created.body.data.id as string;

    await agent.delete(`/api/admin/diagrams/${id}`).expect(200);
    await agent.get(`/api/admin/diagrams/${id}`).expect(404);
  });
});
