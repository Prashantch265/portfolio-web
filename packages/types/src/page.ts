import { z } from "zod";

/**
 * Backend PRD §4 — singleton-per-slug, no draft workflow ("admin
 * publishes directly"). No real content exists yet for any of these
 * slugs (now/uses/credentials) — frontend PRD's own scope note leaves
 * them unbuilt in every direction, so M1a seeds zero Page rows rather
 * than fabricate placeholder copy.
 */
export const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type Page = z.infer<typeof pageSchema>;
