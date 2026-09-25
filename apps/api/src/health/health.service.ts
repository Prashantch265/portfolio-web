import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { sql } from "drizzle-orm";
import type { ReadyResponse } from "@portfolio/types";
import { DRIZZLE, type DrizzleDb } from "../db/drizzle.tokens.js";
import { REDIS_CLIENT } from "../redis/redis.tokens.js";

const CHECK_TIMEOUT_MS = 2000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async checkReady(): Promise<{ body: ReadyResponse; ok: boolean }> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const ok = postgres && redis;
    return {
      ok,
      body: {
        status: ok ? "ok" : "degraded",
        checks: { postgres, redis },
      },
    };
  }

  private async checkPostgres(): Promise<boolean> {
    try {
      await withTimeout(this.db.execute(sql`select 1`), CHECK_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await withTimeout(this.redis.ping(), CHECK_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }
}
