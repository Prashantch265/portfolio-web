import { z } from "zod";

export const listRevisionsQuerySchema = z.object({
  entityType: z.enum(["project", "caseStudySection", "post", "page", "diagram"]).optional(),
  entityId: z.string().uuid().optional(),
});

export type ListRevisionsQuery = z.infer<typeof listRevisionsQuerySchema>;
