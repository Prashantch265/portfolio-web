import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema/index.js";

export const DRIZZLE = Symbol("DRIZZLE_CLIENT");
export const PG_POOL = Symbol("PG_POOL");

export type DrizzleDb = NodePgDatabase<typeof schema>;
