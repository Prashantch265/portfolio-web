import { z } from "zod";

/** Backend PRD §9.2 privacy allow-list applies — no phone/DOB/address/roll numbers, ever. */
export const cvEntrySchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  dates: z.string().optional(), // absent for certifications/accomplishments
  body: z.string().optional(),
});

export const cvSchema = z.object({
  headline: z.string().min(1),
  location: z.string().min(1),
  yearsExperience: z.string().min(1), // "~4.8 years" — a range, never exact-date arithmetic (§9.2)
  summary: z.string().min(1),
  experience: z.array(cvEntrySchema),
  education: z.array(cvEntrySchema),
  certifications: z.array(cvEntrySchema),
  accomplishments: z.array(cvEntrySchema),
});

export type CVEntry = z.infer<typeof cvEntrySchema>;
export type CV = z.infer<typeof cvSchema>;
