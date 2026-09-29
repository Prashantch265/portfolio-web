import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { contentStatus, timestamps } from "../../db/schema/shared";

/**
 * Two deliberate deviations from PRD §4, both allowed by its closing
 * caveat ("exact column types belong in the implementation migration,
 * not this document"):
 *
 * 1. `years` is a single display string (e.g. "2024–present") instead
 *    of `startDate`/`endDate`. A two-date model can't reproduce an
 *    irregular "…–present" suffix without extra formatting logic
 *    nothing else needs — the frontend has always wanted exactly this
 *    string, verbatim.
 * 2. `caseStudySections.body` is `jsonb`, not `text`/markdown. Each
 *    `kind` has a genuinely different shape — `context`/`outcome` are
 *    a single string, `constraints` is `string[]`, `decisions` is an
 *    array of `{heading, body, emphasis}` — and the frontend already
 *    needs that shape (`packages/types`' `projectDecisionSchema`), not
 *    a markdown blob it would then have to parse back out. The public
 *    API's read-model assembly (M1b) is what turns these back into
 *    `Project`'s `context`/`constraints`/`decisions`/`outcome` fields.
 */
export const caseStudySectionKind = pgEnum("case_study_section_kind", [
  "context",
  "constraints",
  "decisions",
  "outcome",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  kicker: text("kicker").notNull(),
  summary: text("summary").notNull(),
  years: text("years").notNull(),
  status: contentStatus("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  stackTags: text("stack_tags").array().notNull().default([]),
  order: integer("order").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  // M1d's draft/publish mechanism: while status='draft', every write
  // lands directly on this row's own columns above — there is nothing
  // public to protect yet. Once status='published', a write instead
  // merges into this jsonb blob (own scalar fields, plus a nested
  // `sections` object holding pending CaseStudySection bodies — a case
  // study "publishes as a whole, not section-by-section" per PRD §4, so
  // a section edit on a published project routes here too, never onto
  // the section's own row). Publishing copies everything in here onto
  // the live columns (project's own + each case_study_sections row) in
  // one transaction, then clears this back to null.
  draftData: jsonb("draft_data"),
  ...timestamps,
});

export const caseStudySections = pgTable(
  "case_study_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: caseStudySectionKind("kind").notNull(),
    // Shape depends on `kind` — see the module comment above.
    body: jsonb("body").notNull(),
    order: integer("order").notNull().default(0),
    ...timestamps,
  },
  (table) => [uniqueIndex("case_study_sections_project_kind_idx").on(table.projectId, table.kind)],
);
