import { z } from "zod";

export const cvSectionKindSchema = z.enum(["experience", "education", "skills", "certifications", "accomplishments"]);
export const cvSectionVisibilitySchema = z.enum(["public", "gated"]);

export const upsertCvSectionDtoSchema = z.object({
  kind: cvSectionKindSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  dateRange: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  visibility: cvSectionVisibilitySchema,
  order: z.number().int().nonnegative(),
});

export type UpsertCvSectionDto = z.infer<typeof upsertCvSectionDtoSchema>;
