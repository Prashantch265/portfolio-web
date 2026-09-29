import { z } from "zod";

export const upsertPostDtoSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  // Nullable — see posts.body's own column comment in db/schema/index.ts:
  // no real long-form body has been authored for any seeded post yet.
  body: z.string().min(1).nullable().default(null),
  tags: z.array(z.string().min(1)).default([]),
  readingMinutes: z.number().int().positive(),
});

export type UpsertPostDto = z.infer<typeof upsertPostDtoSchema>;
