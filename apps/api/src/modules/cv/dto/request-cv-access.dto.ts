import { z } from "zod";

export const requestCvAccessDtoSchema = z.object({
  email: z.string().email(),
  // Honeypot, same pattern as contact's `website` field (§9) — a real
  // visitor never sets this.
  company: z.string().optional(),
});

export type RequestCvAccessDto = z.infer<typeof requestCvAccessDtoSchema>;
