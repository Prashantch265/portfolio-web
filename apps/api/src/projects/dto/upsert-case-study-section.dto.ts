import { z } from "zod";

/**
 * `body`'s real shape depends on `:kind` (a route param, not part of
 * this request body) — the pipe can only confirm an envelope exists.
 * ProjectsService.upsertSection validates `body` against the
 * kind-specific schema in case-study-section-body.schema.ts once it
 * knows which kind it's dealing with.
 */
export const upsertCaseStudySectionDtoSchema = z.object({
  body: z.unknown(),
});

export type UpsertCaseStudySectionDto = z.infer<typeof upsertCaseStudySectionDtoSchema>;
