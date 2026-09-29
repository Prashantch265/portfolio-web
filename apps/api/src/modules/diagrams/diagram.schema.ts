import { integer, jsonb, pgEnum, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../../db/schema/shared";

export const diagramOwnerType = pgEnum("diagram_owner_type", ["project", "standalone"]);

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
