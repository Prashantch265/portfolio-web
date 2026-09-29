import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Backend PRD §4/§6.4. `filename` is the client's original name
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
