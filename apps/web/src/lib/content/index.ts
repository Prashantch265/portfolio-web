import { apiContentSource } from "./api-content-source";

export type { ContentSource } from "./content-source";

/** The one wiring point (see content-source.ts's module comment). */
export const contentSource = apiContentSource;
