import { z } from "zod";

export const updateCvProfileDtoSchema = z.object({
  headline: z.string().min(1),
  location: z.string().min(1),
  yearsExperience: z.string().min(1),
  summaryPublic: z.string().min(1),
  summaryGated: z.string().nullable().optional(),
});

export type UpdateCvProfileDto = z.infer<typeof updateCvProfileDtoSchema>;
