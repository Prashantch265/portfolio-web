import { staticContentSource } from "./static-content-source";

export type { ContentSource } from "./content-source";

/**
 * The one wiring point. F4 (once backend M1 ships) drops in
 * api-content-source.ts and this becomes:
 *   export const contentSource: ContentSource =
 *     process.env.NODE_ENV === "production" ? apiContentSource : staticContentSource;
 * Nothing else in apps/web changes.
 */
export const contentSource = staticContentSource;
