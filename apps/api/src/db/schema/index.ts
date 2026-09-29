/**
 * Barrel only — every table/enum is defined inside its owning feature
 * module (src/modules/<feature>/*.schema.ts), not here. This file
 * exists because Drizzle's relational query API (`db.query.<table>`)
 * and `drizzle(pool, { schema })` both need ONE merged schema object,
 * not because the tables themselves belong to "db". Every consumer's
 * `import * as schema from ".../db/schema/index.js"` sees the exact
 * same shape as before this was split — only the ownership of each
 * table's *definition* moved, not how it's imported.
 *
 * `./shared.ts` holds the two things genuinely cross-feature
 * (`contentStatus`, `timestamps`) rather than being arbitrarily owned
 * by one module.
 *
 * These imports deliberately omit the `.js` extension this codebase
 * otherwise uses everywhere (tsc/tsx/vitest all resolve it fine either
 * way under this app's CommonJS+classic module resolution) —
 * drizzle-kit's own schema loader fails to resolve a nested `.js`-
 * suffixed relative import against its `.ts` source file (only the
 * entry file drizzle.config.ts points at gets that special-cased),
 * throwing a plain `MODULE_NOT_FOUND`. Extensionless is the one form
 * both drizzle-kit and the rest of the toolchain agree on.
 */
export * from "./shared";
export * from "../../modules/projects/project.schema";
export * from "../../modules/diagrams/diagram.schema";
export * from "../../modules/posts/post.schema";
export * from "../../modules/tags/tag.schema";
export * from "../../modules/pages/page.schema";
export * from "../../modules/cv/cv.schema";
export * from "../../modules/admin-auth/admin-user.schema";
export * from "../../modules/revisions/revision.schema";
export * from "../../modules/media/media-asset.schema";
