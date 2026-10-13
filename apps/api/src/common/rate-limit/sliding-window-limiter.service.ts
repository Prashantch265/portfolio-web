import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";

export interface SlidingWindowResult {
  allowed: boolean;
  /** Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

/**
 * Plain "reject over N in window" throttling — distinct from
 * BruteForceGuardService's progressive-lockout semantics, which escalate
 * a subject's lockout across repeated offenses. A rate limit (contact
 * form submissions, analytics ingest) should let a subject straight back
 * in the moment the window rolls off, never compound into a longer ban.
 * Same underlying Redis zset sliding-window technique, no lockout state.
 */
@Injectable()
export class SlidingWindowLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async check(subject: string, windowMs: number, maxCount: number): Promise<SlidingWindowResult> {
    const key = `rl:${subject}`;
    const now = Date.now();

    await this.redis
      .multi()
      .zadd(key, now, `${now}:${Math.random()}`)
      .zremrangebyscore(key, 0, now - windowMs)
      .expire(key, Math.ceil(windowMs / 1000))
      .exec();

    const count = await this.redis.zcard(key);
    if (count <= maxCount) return { allowed: true, retryAfterSeconds: 0 };

    const ttl = await this.redis.ttl(key);
    return { allowed: false, retryAfterSeconds: Math.max(ttl, 1) };
  }
}
