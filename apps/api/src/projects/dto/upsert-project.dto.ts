import { z } from "zod";

export const upsertProjectDtoSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  kicker: z.string().min(1),
  summary: z.string().min(1),
  years: z.string().min(1),
  featured: z.boolean().default(false),
  stackTags: z.array(z.string().min(1)).default([]),
  order: z.number().int().default(0),
});

export type UpsertProjectDto = z.infer<typeof upsertProjectDtoSchema>;
