import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../redis/redis.tokens.js";

/**
 * Cache-aside, short-TTL only (backend PRD §5/§14) — blind expiry is
 * correct and sufficient here because nothing writes content yet
 * (M1d's publish transaction is what eventually invalidates on write,
 * not this milestone). A Redis outage degrades to "always recompute",
 * never to an error — caching is an optimization, not a correctness
 * dependency, so a failed get/set is logged and swallowed rather than
 * thrown into the request path.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async wrap<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (err) {
      this.logger.warn(`Cache read failed for key "${key}": ${(err as Error).message}`);
    }

    const value = await compute();

    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache write failed for key "${key}": ${(err as Error).message}`);
    }

    return value;
  }

  /**
   * The real invalidation point (backend PRD §14 — "cache invalidated
   * on publish, not TTL alone"): every write path that changes what a
   * cached read would return calls this with the same key(s) that read
   * uses. Swallows a Redis failure the same way `wrap` does — a failed
   * invalidation degrades to "stale for up to the TTL," never an error
   * on the write path that caused it.
   */
  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache invalidation failed for keys [${keys.join(", ")}]: ${(err as Error).message}`);
    }
  }

  /**
   * For a read cached under many keys that share one prefix but vary
   * per-request (e.g. posts' cursor-paginated list — one key per
   * limit/cursor combination, no single key covers "the list"). Uses
   * SCAN, not KEYS — KEYS blocks the whole Redis instance while it
   * walks the keyspace; SCAN doesn't.
   */
  async invalidatePattern(prefix: string): Promise<void> {
    try {
      const keys: string[] = [];
      const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 });
      for await (const chunk of stream as AsyncIterable<string[]>) keys.push(...chunk);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache pattern invalidation failed for prefix "${prefix}": ${(err as Error).message}`);
    }
  }
}
