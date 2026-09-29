import { index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "../admin-auth/admin-user.schema";

export const revisionEntityType = pgEnum("revision_entity_type", [
  "project",
  "caseStudySection",
  "post",
  "page",
  "diagram",
]);

/**
 * Backend PRD §6.3. Append-only: every draft or publish write to a
 * versioned entity writes one row here first (same transaction), a
 * full snapshot of the resulting effective state — never an id-only or
 * diff-only record, so restore never needs to reconstruct history from
 * anything but this one row. Not written for CVProfile/CVSection or
 * Tag — both excluded by the PRD's own §4 model.
 */
export const revisions = pgTable(
  "revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: revisionEntityType("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => adminUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Not unique — many revisions accumulate for the same entity over
  // time by design. Indexed (not uniquely) for the admin revisions
  // list query's WHERE + ORDER BY.
  (table) => [index("revisions_entity_idx").on(table.entityType, table.entityId, table.createdAt)],
);
