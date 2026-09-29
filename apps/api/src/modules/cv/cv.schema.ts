import { integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../../db/schema/shared";

export const cvSectionKind = pgEnum("cv_section_kind", [
  "experience",
  "education",
  "skills",
  "certifications",
  // Not in the PRD's own kind list — the frontend's CV genuinely has a
  // separate `accomplishments` array (packages/types' cv.ts), rendered
  // alongside certifications but sourced distinctly. Keeping it a
  // separate kind here (rather than folding it into `certifications`)
  // preserves that distinction for the API assembly layer to recombine
  // however M1b's `/api/cv/public` actually wants it.
  "accomplishments",
]);

export const cvSectionVisibility = pgEnum("cv_section_visibility", ["public", "gated"]);

export const cvProfiles = pgTable("cv_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  headline: text("headline").notNull(),
  // Not in the PRD's abbreviated CVProfile field list, but genuinely
  // needed by the frontend (packages/types' cv.ts) — the PRD's own
  // preamble says the list is abbreviated to what matters for its
  // decisions, not exhaustive.
  location: text("location").notNull(),
  yearsExperience: text("years_experience").notNull(),
  summaryPublic: text("summary_public").notNull(),
  summaryGated: text("summary_gated"),
  ...timestamps,
});

export const cvSections = pgTable("cv_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  cvProfileId: uuid("cv_profile_id")
    .notNull()
    .references(() => cvProfiles.id, { onDelete: "cascade" }),
  kind: cvSectionKind("kind").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  // Nullable: certifications/accomplishments entries carry no date
  // range or body in the real content (only experience/education do).
  dateRange: text("date_range"),
  body: text("body"),
  visibility: cvSectionVisibility("visibility").notNull().default("public"),
  order: integer("order").notNull().default(0),
  ...timestamps,
});
