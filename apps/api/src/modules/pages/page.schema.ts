import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // No draft/publish state and no createdAt, per PRD §4: "admin
  // publishes directly" — matching the PRD's own field list exactly.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
