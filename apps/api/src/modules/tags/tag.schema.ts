import { pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const tagKind = pgEnum("tag_kind", ["project", "post"]);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    kind: tagKind("kind").notNull(),
  },
  (table) => [uniqueIndex("tags_label_kind_idx").on(table.label, table.kind)],
);
