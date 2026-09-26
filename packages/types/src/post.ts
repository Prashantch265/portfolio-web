import { z } from "zod";

export const postSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.string().min(1), // ISO date, e.g. "2026-03-14"
  readingMinutes: z.number().int().positive(),
  tags: z.array(z.string().min(1)),
});

export type Post = z.infer<typeof postSchema>;
