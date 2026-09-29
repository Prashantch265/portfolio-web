import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../../db/schema/shared";

/**
 * Backend PRD §6.1. Single row in practice, modeled as a table anyway
 * ("so the auth code path is the same one a multi-admin future would
 * use" — PRD's own words). `totpSecret` and `passwordHash` are never
 * serialized in any API response — enforced at the assembly layer in
 * admin-auth.service.ts, not by a response-shape accident.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret").notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});
