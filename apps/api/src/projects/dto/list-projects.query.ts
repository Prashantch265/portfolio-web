import { z } from "zod";

export const listProjectsQuerySchema = z.object({
  // Query params arrive as strings regardless of intent — accept the
  // literal "true"/"false" and reject anything else rather than
  // z.coerce.boolean(), which treats every non-empty string (including
  // the string "false") as true.
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
