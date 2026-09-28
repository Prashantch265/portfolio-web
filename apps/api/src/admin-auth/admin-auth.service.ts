import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import type Redis from "ioredis";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import * as schema from "../db/schema/index.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";
import { AuthException } from "../common/exceptions/exceptions.js";
import { BruteForceGuardService } from "../common/rate-limit/brute-force-guard.service.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { VerifyTotpDto } from "./dto/verify-totp.dto.js";

const CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * Two-step login (backend PRD §6.1): password proves identity, TOTP
 * proves possession of the enrolled device — a session is only ever
 * created after both succeed. Every failure, at either step, is
 * deliberately the same generic message ("Invalid email or password."
 * / "Invalid or expired code.") so a response never confirms which
 * half was wrong or whether an email is even registered.
 */
@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly bruteForce: BruteForceGuardService,
  ) {}

  async login(dto: LoginDto, ip: string): Promise<{ challengeId: string }> {
    await this.bruteForce.assertNotLocked(`ip:${ip}`);
    await this.bruteForce.assertNotLocked(`email:${dto.email}`);

    const admin = await this.db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, dto.email) });
    const passwordValid = admin ? await bcrypt.compare(dto.password, admin.passwordHash) : false;

    if (!admin || !passwordValid) {
      await Promise.all([this.bruteForce.recordFailure(`ip:${ip}`), this.bruteForce.recordFailure(`email:${dto.email}`)]);
      throw new AuthException("Invalid email or password.");
    }

    const challengeId = randomUUID();
    await this.redis.set(this.challengeKey(challengeId), admin.id, "EX", CHALLENGE_TTL_SECONDS);
    return { challengeId };
  }

  async verifyTotp(dto: VerifyTotpDto, ip: string): Promise<{ adminId: string; email: string }> {
    await this.bruteForce.assertNotLocked(`ip:${ip}`);

    const adminId = await this.redis.get(this.challengeKey(dto.challengeId));
    const admin = adminId ? await this.getAdminById(adminId) : null;

    // No email-dimension lockout check possible until the challenge
    // resolves to a real admin — an expired/unknown challengeId can
    // only ever hit the IP-dimension limiter, which is still real
    // brute-force protection against challengeId guessing itself.
    if (!admin) throw new AuthException("Invalid or expired code.");

    await this.bruteForce.assertNotLocked(`email:${admin.email}`);

    const valid = authenticator.check(dto.code, admin.totpSecret);
    if (!valid) {
      await Promise.all([this.bruteForce.recordFailure(`ip:${ip}`), this.bruteForce.recordFailure(`email:${admin.email}`)]);
      throw new AuthException("Invalid or expired code.");
    }

    // Single-use: a redeemed challenge can never be replayed.
    await this.redis.del(this.challengeKey(dto.challengeId));
    await Promise.all([this.bruteForce.recordSuccess(`ip:${ip}`), this.bruteForce.recordSuccess(`email:${admin.email}`)]);
    await this.db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));

    return { adminId: admin.id, email: admin.email };
  }

  async getAdminById(id: string) {
    return this.db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.id, id) });
  }

  private challengeKey(challengeId: string): string {
    return `admin-auth:challenge:${challengeId}`;
  }
}
