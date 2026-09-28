import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";
import { TooManyRequestsException } from "../exceptions/exceptions.js";

const WINDOW_MS = 15 * 60 * 1000; // failed-attempt window before a lockout triggers
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_LOCKOUT_MS = 24 * 60 * 60 * 1000;
const TIER_MEMORY_MS = 24 * 60 * 60 * 1000; // how long consecutive lockouts keep escalating

/**
 * Redis-backed sliding-window brute-force guard (backend PRD §13:
 * "admin login: per IP and per account with progressive lockout").
 * Reusable by subject — call it once per dimension you want to guard
 * (e.g. one instance-level check for the request IP, one for the
 * account's email); either being locked blocks the attempt.
 *
 * Progressive: each time a subject crosses MAX_ATTEMPTS again within
 * TIER_MEMORY_MS of its last lockout, the next lockout is twice as
 * long (capped at MAX_LOCKOUT_MS) — a single successful auth clears
 * the tier back to zero.
 */
@Injectable()
export class BruteForceGuardService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertNotLocked(subject: string): Promise<void> {
    const ttl = await this.redis.ttl(this.lockoutKey(subject));
    if (ttl > 0) {
      const retryAfterMinutes = Math.ceil(ttl / 60);
      throw new TooManyRequestsException(
        `Too many failed attempts. Try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`,
      );
    }
  }

  async recordFailure(subject: string): Promise<void> {
    const attemptsKey = this.attemptsKey(subject);
    const now = Date.now();

    await this.redis
      .multi()
      .zadd(attemptsKey, now, `${now}:${Math.random()}`)
      .zremrangebyscore(attemptsKey, 0, now - WINDOW_MS)
      .expire(attemptsKey, Math.ceil(WINDOW_MS / 1000))
      .exec();

    const count = await this.redis.zcard(attemptsKey);
    if (count < MAX_ATTEMPTS) return;

    await this.redis.del(attemptsKey);

    const tierKey = this.tierKey(subject);
    const tier = await this.redis.incr(tierKey);
    if (tier === 1) await this.redis.expire(tierKey, Math.ceil(TIER_MEMORY_MS / 1000));

    const lockoutMs = Math.min(BASE_LOCKOUT_MS * 2 ** (tier - 1), MAX_LOCKOUT_MS);
    await this.redis.set(this.lockoutKey(subject), tier, "EX", Math.ceil(lockoutMs / 1000));
  }

  async recordSuccess(subject: string): Promise<void> {
    await this.redis.del(this.attemptsKey(subject), this.lockoutKey(subject), this.tierKey(subject));
  }

  private attemptsKey(subject: string): string {
    return `bf:attempts:${subject}`;
  }
  private lockoutKey(subject: string): string {
    return `bf:lockout:${subject}`;
  }
  private tierKey(subject: string): string {
    return `bf:lockout-tier:${subject}`;
  }
}
