import type { INestApplication } from "@nestjs/common";
import type Redis from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
import { authenticator } from "otplib";
import { createTestApp } from "../../test-support/create-test-app.js";
import { insertAdminFixture, cleanupAdminByEmailPrefix } from "../../test-support/fixtures.js";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import * as schema from "../../db/schema/index.js";
import { MAIL_ADAPTER } from "../../common/mail/mail.tokens.js";
import type { MailAdapter, MailMessage } from "../../common/mail/mail-adapter.interface.js";

const TEST_ADMIN_EMAIL_PREFIX = "test-admin-cv-access-";
const TEST_REQUEST_EMAIL_PREFIX = "test-cv-request-";

async function authenticatedAgent(app: INestApplication, db: DrizzleDb) {
  const admin = await insertAdminFixture(db, { email: `${TEST_ADMIN_EMAIL_PREFIX}${crypto.randomUUID()}@example.com` });
  const agent = request.agent(app.getHttpServer());
  const loginRes = await agent.post("/api/admin/auth/login").send({ email: admin.email, password: admin.plainPassword });
  const code = authenticator.generate(admin.totpSecret);
  await agent.post("/api/admin/auth/totp").send({ challengeId: loginRes.body.data.challengeId, code });
  return agent;
}

function extractToken(text: string): string {
  const match = /\/cv\/access\/([0-9a-f]+)/.exec(text);
  if (!match) throw new Error(`No token found in mail text: ${text}`);
  return match[1]!;
}

describe("CV access grants (e2e)", () => {
  let app: INestApplication;
  let db: DrizzleDb;
  let redis: Redis;
  let mailAdapter: MailAdapter;
  let sent: MailMessage[];
  let createdProfileFixture = false;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get(DRIZZLE);
    redis = app.get(REDIS_CLIENT);
    mailAdapter = app.get(MAIL_ADAPTER);

    // redeemToken() reads through CVProfile (§7 step 3) — same
    // fresh-CI-database concern cv.e2e.spec.ts's own beforeAll flags.
    const existing = await db.query.cvProfiles.findFirst();
    if (!existing) {
      await db.insert(schema.cvProfiles).values({
        headline: "Test headline",
        location: "Test location",
        yearsExperience: "~1 year",
        summaryPublic: "Original public summary.",
        summaryGated: "Gated summary.",
      });
      createdProfileFixture = true;
    }
  });

  beforeEach(async () => {
    await redis.flushall();
    sent = [];
    mailAdapter.send = async (msg: MailMessage) => {
      sent.push(msg);
    };
  });

  afterAll(async () => {
    await cleanupAdminByEmailPrefix(db, TEST_ADMIN_EMAIL_PREFIX);
    await db.delete(schema.cvAccessGrants).where(like(schema.cvAccessGrants.email, `${TEST_REQUEST_EMAIL_PREFIX}%`));
    if (createdProfileFixture) await db.delete(schema.cvProfiles).where(eq(schema.cvProfiles.summaryPublic, "Original public summary."));
    await app.close();
  });

  it("requires a session for every admin cv-requests route", async () => {
    await request(app.getHttpServer()).get("/api/admin/cv-requests").expect(401);
    await request(app.getHttpServer()).post("/api/admin/cv-requests/00000000-0000-0000-0000-000000000000/approve").expect(401);
  });

  it("looks like success but drops a honeypot-filled request", async () => {
    const email = `${TEST_REQUEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`;
    await request(app.getHttpServer()).post("/api/cv/request").send({ email, company: "spam-co" }).expect(200);

    const rows = await db.query.cvAccessGrants.findMany({ where: (t, { eq }) => eq(t.email, email) });
    expect(rows).toHaveLength(0);
  });

  it("full lifecycle: request -> approve -> redeem -> same-visit PDF read -> locked after the grace window", async () => {
    const email = `${TEST_REQUEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`;
    await request(app.getHttpServer()).post("/api/cv/request").send({ email }).expect(200);

    const admin = await authenticatedAgent(app, db);
    const list = await admin.get("/api/admin/cv-requests").expect(200);
    const grant = list.body.data.find((g: { email: string }) => g.email === email);
    expect(grant.status).toBe("pending");

    const approved = await admin.post(`/api/admin/cv-requests/${grant.id}/approve`).expect(201);
    expect(approved.body.data.status).toBe("approved");
    // sent[0] is requestAccess's own admin-notification email — the
    // access link is whatever approve() sent most recently.
    const token = extractToken(sent.at(-1)!.text);

    // Re-approving an already-approved request is a conflict, not a
    // silent re-mint of a second token for the same grant.
    await admin.post(`/api/admin/cv-requests/${grant.id}/approve`).expect(409);

    const redeemed = await request(app.getHttpServer()).get(`/api/cv/access/${token}`).expect(200);
    expect(redeemed.body.data).toHaveProperty("summaryGated");

    // Same-visit re-read (e.g. the page view, then "Download PDF")
    // still works — the grace window exists exactly for this.
    const second = await request(app.getHttpServer()).get(`/api/cv/access/${token}`);
    expect(second.status).toBe(200);

    // Back-date usedAt past the grace window to simulate a later visit
    // without waiting 5 real minutes — now it locks for good.
    await db
      .update(schema.cvAccessGrants)
      .set({ usedAt: new Date(Date.now() - 6 * 60 * 1000) })
      .where(eq(schema.cvAccessGrants.id, grant.id));
    const third = await request(app.getHttpServer()).get(`/api/cv/access/${token}`);
    expect(third.status).toBe(404);
  });

  it("revoke invalidates an approved-but-unused grant", async () => {
    const email = `${TEST_REQUEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`;
    await request(app.getHttpServer()).post("/api/cv/request").send({ email }).expect(200);

    const admin = await authenticatedAgent(app, db);
    const list = await admin.get("/api/admin/cv-requests").expect(200);
    const grant = list.body.data.find((g: { email: string }) => g.email === email);

    await admin.post(`/api/admin/cv-requests/${grant.id}/approve`).expect(201);
    const token = extractToken(sent.at(-1)!.text);

    const revoked = await admin.post(`/api/admin/cv-requests/${grant.id}/revoke`).expect(201);
    expect(revoked.body.data.status).toBe("revoked");

    const res = await request(app.getHttpServer()).get(`/api/cv/access/${token}`);
    expect(res.status).toBe(404);
  });

  it("rate-limits repeated requests from the same email", async () => {
    const email = `${TEST_REQUEST_EMAIL_PREFIX}${crypto.randomUUID()}@example.com`;
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post("/api/cv/request").send({ email }).expect(200);
    }
    const res = await request(app.getHttpServer()).post("/api/cv/request").send({ email });
    expect(res.status).toBe(429);
  });
});
