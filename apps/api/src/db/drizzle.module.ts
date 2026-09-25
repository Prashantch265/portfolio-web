import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { DRIZZLE, PG_POOL, type DrizzleDb } from "./drizzle.tokens.js";

/**
 * Hand-rolled — no official Nest–Drizzle module exists (backend PRD §3).
 * Global so HealthModule and every future feature module can inject
 * DRIZZLE without re-declaring the import.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => new Pool({ connectionString: process.env.DATABASE_URL }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDb => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
