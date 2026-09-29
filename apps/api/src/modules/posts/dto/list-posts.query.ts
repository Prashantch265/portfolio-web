import { z } from "zod";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const listPostsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
