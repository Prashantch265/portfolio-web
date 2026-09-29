import { pgEnum, timestamp } from "drizzle-orm/pg-core";

/**
 * Genuinely cross-feature, not owned by any one module: `contentStatus`
 * is Project's AND Post's draft/publish gate, and `timestamps` is
 * spread into most tables regardless of feature. Lives here (db/,
 * infra) rather than being arbitrarily assigned to one module.
 */
export const contentStatus = pgEnum("content_status", ["draft", "published"]);

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
