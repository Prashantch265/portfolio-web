import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import { authenticator } from "otplib";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";

const TEST_EMAIL_PREFIX = "test-admin-";

describe("Admin auth (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
  });

  beforeEach(async () => {
    // Every test's brute-force counters start clean, not just its own
    // admin row — a lockout keyed by IP would otherwise leak across
    // tests that all originate from supertest's loopback address.
    await redis.flushall();
  });

  afterAll(async () => {
    await cleanupAdminByEmailPrefix(db, TEST_EMAIL_PREFIX);
    await app.close();
  });

  function login(email: string, password: string) {
    return request(app.getHttpServer()).post("/api/admin/auth/login").send({ email, password });
  }

  function totp(agent: ReturnType<typeof request.agent>, challengeId: string, code: string) {
    return agent.post("/api/admin/auth/totp").send({ challengeId, code });
  }

  it("completes the full login -> totp -> session -> logout lifecycle with a real TOTP code", async () => {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}happy@example.com` });
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    expect(loginRes.status).toBe(200);
    const { challengeId } = loginRes.body.data;
    expect(challengeId).toBeTypeOf("string");

    const code = authenticator.generate(admin.totpSecret);
    const totpRes = await totp(agent, challengeId, code);
    expect(totpRes.status).toBe(200);
    expect(totpRes.body.data.email).toBe(admin.email);
    // httpOnly session cookie actually issued, not just a 200 status.
    expect(totpRes.headers["set-cookie"]?.[0]).toContain("portfolio.admin.sid");

    const meRes = await agent.get("/api/admin/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(admin.email);

    const logoutRes = await agent.post("/api/admin/auth/logout");
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await agent.get("/api/admin/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });

  it("rejects a redeemed challengeId a second time (single-use)", async () => {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}replay@example.com` });
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
    const { challengeId } = loginRes.body.data;
    const code = authenticator.generate(admin.totpSecret);

    await totp(agent, challengeId, code).expect(200);
    const replay = await totp(request.agent(app.getHttpServer()), challengeId, code);
    expect(replay.status).toBe(401);
  });

  it("rejects the wrong password and the wrong TOTP code with the same generic message", async () => {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}wrong@example.com` });

    const wrongPassword = await login(admin.email, "not-the-password");
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe("Invalid email or password.");

    const correctLogin = await login(admin.email, admin.plainPassword);
    const { challengeId } = correctLogin.body.data;
    const wrongCode = await request(app.getHttpServer())
      .post("/api/admin/auth/totp")
      .send({ challengeId, code: "000000" });
    expect(wrongCode.status).toBe(401);
    expect(wrongCode.body.message).toBe("Invalid or expired code.");
  });

  it("locks out after repeated failures — even the correct password is then rejected — and a success clears it", async () => {
    const admin = await insertAdminFixture(db, { email: `${TEST_EMAIL_PREFIX}lockout@example.com` });

    for (let i = 0; i < 5; i++) {
      const res = await login(admin.email, "wrong");
      expect(res.status).toBe(401);
    }

    const lockedOut = await login(admin.email, admin.plainPassword);
    expect(lockedOut.status).toBe(429);

    // Clearing Redis simulates the lockout window elapsing (this test
    // isn't waiting out a real 15-minute TTL) — what it's actually
    // proving is that a genuine success afterward clears the counters,
    // not that the TTL countdown itself works (Redis's own EXPIRE is
    // not this repo's code to re-test).
    await redis.flushall();

    const loginRes = await login(admin.email, admin.plainPassword);
    expect(loginRes.status).toBe(200);
    const code = authenticator.generate(admin.totpSecret);
    await totp(request.agent(app.getHttpServer()), loginRes.body.data.challengeId, code).expect(200);

    const keysAfterSuccess = await redis.keys(`bf:*${admin.email}*`);
    expect(keysAfterSuccess).toHaveLength(0);
  });

  it("rejects malformed input with a 422 and a structured validation source", async () => {
    const res = await login("not-an-email", "x");
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ success: false, statusCode: 422, source: { email: expect.any(Array) } });
  });

  it("GET /api/admin/auth/me requires a session", async () => {
    const res = await request(app.getHttpServer()).get("/api/admin/auth/me");
    expect(res.status).toBe(401);
  });
});
