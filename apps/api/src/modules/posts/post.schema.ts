import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentStatus, timestamps } from "../../db/schema/shared";

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  // Nullable: no real long-form post body has been authored yet for
  // any of the three seeded posts (confirmed against the mockup's own
  // source data, which has none either) — NOT NULL would force
  // fabricating content nothing has actually written, which this
  // project's own discipline avoids (every value real or omitted).
  body: text("body"),
  status: contentStatus("status").notNull().default("draft"),
  tags: text("tags").array().notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  readingMinutes: integer("reading_minutes").notNull(),
  // Same draft/publish shape as projects.draftData.
  draftData: jsonb("draft_data"),
  ...timestamps,
});
