import { existsSync } from "node:fs";
import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import { eq } from "drizzle-orm";
import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authenticator } from "otplib";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";
import { mediaFilePath } from "./lib/storage.js";

const TEST_EMAIL_PREFIX = "test-admin-media-";

async function makePngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } })
    .png()
    .toBuffer();
}

const SAFE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red" /></svg>`;
const MALICIOUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(document.cookie)</script><circle cx="5" cy="5" r="4" fill="red" onclick="evil()" /></svg>`;

describe("Media admin (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  const uploadedIds: string[] = [];

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
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    for (const id of uploadedIds) {
      await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
    }
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  it("requires a session for every admin media route", async () => {
    await request(app.getHttpServer()).get("/api/admin/media").expect(401);
    await request(app.getHttpServer()).post("/api/admin/media").expect(401);
  });

  it("uploads a PNG, detects its real mime type + dimensions, and generates smaller-than-original derivatives", async () => {
    const agent = await authenticatedAgent();
    const png = await makePngBuffer(1000, 500);

    const res = await agent.post("/api/admin/media").attach("file", png, "photo.png").expect(201);
    uploadedIds.push(res.body.data.id);

    expect(res.body.data.mimeType).toBe("image/png");
    expect(res.body.data.width).toBe(1000);
    expect(res.body.data.height).toBe(500);
    // 1600w breakpoint skipped (>= original width 1000), 400w/800w kept.
    expect(Object.keys(res.body.data.derivatives).sort()).toEqual(["400w", "800w"]);
  });

  it("serves the original with the server-detected Content-Type, and a derivative as image/webp", async () => {
    const agent = await authenticatedAgent();
    const png = await makePngBuffer(1000, 500);
    const created = await agent.post("/api/admin/media").attach("file", png, "photo.png").expect(201);
    uploadedIds.push(created.body.data.id);
    const id = created.body.data.id as string;

    const original = await request(app.getHttpServer()).get(`/api/media/${id}`).expect(200);
    expect(original.headers["content-type"]).toMatch(/^image\/png/);

    const derivative = await request(app.getHttpServer()).get(`/api/media/${id}/400w`).expect(200);
    expect(derivative.headers["content-type"]).toMatch(/^image\/webp/);
  });

  it("rejects a disallowed file type (real bytes, not extension) with a 422", async () => {
    const agent = await authenticatedAgent();
    const notAnImage = Buffer.from("just some plain text, not an image at all", "utf8");

    const res = await agent.post("/api/admin/media").attach("file", notAnImage, "totally-a-photo.png");
    expect(res.status).toBe(422);
  });

  it("rejects an upload over the server-enforced size cap with a 413", async () => {
    const agent = await authenticatedAgent();
    const oversized = Buffer.alloc(9 * 1024 * 1024, 0); // 9MB > MAX_UPLOAD_BYTES (8MB)

    const res = await agent.post("/api/admin/media").attach("file", oversized, "huge.png");
    expect(res.status).toBe(413);
  });

  it("sanitizes an SVG upload: strips <script> and event-handler attributes before storage", async () => {
    const agent = await authenticatedAgent();
    const res = await agent
      .post("/api/admin/media")
      .attach("file", Buffer.from(MALICIOUS_SVG, "utf8"), "icon.svg")
      .expect(201);
    uploadedIds.push(res.body.data.id);
    expect(res.body.data.mimeType).toBe("image/svg+xml");

    const served = await request(app.getHttpServer()).get(`/api/media/${res.body.data.id}`).expect(200);
    // superagent only populates `.text` for content-types it recognizes
    // as text; image/svg+xml isn't one, so it lands in `.body` as a Buffer.
    const stored = Buffer.from(served.body as Buffer).toString("utf8");
    expect(stored).not.toContain("<script");
    expect(stored).not.toContain("onload");
    expect(stored).not.toContain("onclick");
    expect(stored).toContain("<circle");
  });

  it("accepts a well-formed SVG unchanged in substance", async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post("/api/admin/media").attach("file", Buffer.from(SAFE_SVG, "utf8"), "icon.svg").expect(201);
    uploadedIds.push(res.body.data.id);
    expect(res.body.data.mimeType).toBe("image/svg+xml");
    expect(res.body.data.width).toBeNull();
  });

  it("deletes a media asset and removes its files from disk", async () => {
    const agent = await authenticatedAgent();
    const png = await makePngBuffer(500, 500);
    const created = await agent.post("/api/admin/media").attach("file", png, "photo.png").expect(201);
    const id = created.body.data.id as string;
    const derivativePath = created.body.data.derivatives["400w"].path as string;

    expect(existsSync(mediaFilePath(`${id}.png`))).toBe(true);
    expect(existsSync(mediaFilePath(derivativePath))).toBe(true);

    await agent.delete(`/api/admin/media/${id}`).expect(200);

    expect(existsSync(mediaFilePath(`${id}.png`))).toBe(false);
    expect(existsSync(mediaFilePath(derivativePath))).toBe(false);
    await agent.get(`/api/admin/media/${id}`).expect(404);
  });
});
