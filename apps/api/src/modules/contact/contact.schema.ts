import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../../db/schema/shared";

export const contactMessageStatus = pgEnum("contact_message_status", ["new", "read", "archived", "spam"]);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  // Never the raw IP (backend PRD §10's privacy posture, which §9
  // extends to this table by name) — sha256, salted, one-way.
  ipHash: text("ip_hash").notNull(),
  status: contactMessageStatus("status").notNull().default("new"),
  ...timestamps,
});
