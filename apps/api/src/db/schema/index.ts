import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * M1a — backend PRD §4 entities. Only the tables M1b's public read
 * endpoints need (Project, CaseStudySection, Diagram, Post, Tag, Page,
 * CVProfile, CVSection). MediaAsset/ContactMessage/CVAccessGrant/
 * AnalyticsEvent/AdminUser/Revision land in the milestone that first
 * needs them (M1c/M1d), per the roadmap's four-slice split.
 *
 * Two deliberate deviations from the PRD's own §4 table, both allowed
 * by its closing caveat ("exact column types belong in the
 * implementation migration, not this document"):
 *
 * 1. `projects.years` is a single display string (e.g. "2024–present")
 *    instead of `startDate`/`endDate`. A two-date model can't
 *    reproduce an irregular "…–present" suffix without extra
 *    formatting logic nothing else needs — the frontend has always
 *    wanted exactly this string, verbatim.
 * 2. `caseStudySections.body` is `jsonb`, not `text`/markdown. Each
 *    `kind` has a genuinely different shape — `context`/`outcome` are
 *    a single string, `constraints` is `string[]`, `decisions` is an
 *    array of `{heading, body, emphasis}` — and the frontend already
 *    needs that shape (`packages/types`' `projectDecisionSchema`), not
 *    a markdown blob it would then have to parse back out. The public
 *    API's read-model assembly (M1b) is what turns these back into
 *    `Project`'s `context`/`constraints`/`decisions`/`outcome` fields.
 *
 * Draft/publish storage mechanism (how an edit to a published row
 * stays invisible until publish) is deliberately NOT designed here —
 * that's M1d's problem, once its actual CRUD/publish-transaction shape
 * is known. `status`/`publishedAt` below are enough for M1b's
 * published-only read filtering, which is all this slice needs.
 */

export const contentStatus = pgEnum("content_status", ["draft", "published"]);
export const revisionEntityType = pgEnum("revision_entity_type", [
  "project",
  "caseStudySection",
  "post",
  "page",
  "diagram",
]);
export const caseStudySectionKind = pgEnum("case_study_section_kind", [
  "context",
  "constraints",
  "decisions",
  "outcome",
]);
export const diagramOwnerType = pgEnum("diagram_owner_type", ["project", "standalone"]);
export const tagKind = pgEnum("tag_kind", ["project", "post"]);
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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

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
  // M1d's draft/publish mechanism (deliberately deferred in M1a until
  // the CRUD shape was known): while status='draft', every write lands
  // directly on this row's own columns above — there is nothing public
  // to protect yet. Once status='published', a write instead merges
  // into this jsonb blob (own scalar fields, plus a nested `sections`
  // object holding pending CaseStudySection bodies — a case study
  // "publishes as a whole, not section-by-section" per PRD §4, so a
  // section edit on a published project routes here too, never onto
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

export const diagrams = pgTable(
  "diagrams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerType: diagramOwnerType("owner_type").notNull().default("project"),
    // Polymorphic (ownerType, ownerId) pair — deliberately no FK, since
    // ownerType can point at more than one table (frontend PRD §5.1's
    // "standalone" diagrams aren't owned by a Project row at all).
    ownerId: uuid("owner_id").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    nodes: jsonb("nodes").notNull(),
    edges: jsonb("edges").notNull(),
    groups: jsonb("groups"),
    textEquivalent: jsonb("text_equivalent").notNull(),
    version: integer("version").notNull().default(1),
    publishedVersion: integer("published_version"),
    // Same draft/publish shape as projects.draftData — pending
    // nodes/edges/groups/textEquivalent, applied to the live columns
    // above on publish. `version` increments on every save regardless
    // of draft or live; `publishedVersion` records which version
    // number was live-copied most recently.
    draftData: jsonb("draft_data"),
    ...timestamps,
  },
  (table) => [uniqueIndex("diagrams_owner_idx").on(table.ownerType, table.ownerId)],
);

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

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    kind: tagKind("kind").notNull(),
  },
  (table) => [uniqueIndex("tags_label_kind_idx").on(table.label, table.kind)],
);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // No draft/publish state and no createdAt, per PRD §4: "admin
  // publishes directly" — matching the PRD's own field list exactly.
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

/**
 * M1c — backend PRD §6.1. Single row in practice, modeled as a table
 * anyway ("so the auth code path is the same one a multi-admin future
 * would use" — PRD's own words). `totpSecret` and `passwordHash` are
 * never serialized in any API response — enforced at the assembly
 * layer in admin-auth.service.ts, not by a response-shape accident.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  totpSecret: text("totp_secret").notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
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

/**
 * M1d — backend PRD §6.3. Append-only: every draft or publish write to
 * a versioned entity writes one row here first (same transaction), a
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

/**
 * M1d — backend PRD §4/§6.4. `filename` is the client's original name
 * (sanitized, display-only) — it is NEVER used to build the on-disk
 * path; the actual stored path is `${id}.${ext}`, with `ext` derived
 * from the server-verified mime type, not the client's. This is what
 * makes path traversal structurally impossible rather than merely
 * filtered: nothing client-supplied ever reaches the filesystem path.
 * `width`/`height` are null for `image/svg+xml` (vector, no fixed
 * raster size) and for any raster image sharp couldn't read metadata
 * from. `derivatives` is `{}` for svg (vector, no resized variants
 * generated) and for any raster image below the smallest breakpoint.
 */
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  derivatives: jsonb("derivatives").notNull().default({}),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});
