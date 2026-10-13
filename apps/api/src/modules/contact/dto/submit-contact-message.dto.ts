import { z } from "zod";

export const submitContactMessageDtoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  // Honeypot (backend PRD §9) — invisible to a real visitor (frontend
  // PRD §7's contact-form component hides it from sighted and
  // assistive-tech users alike), so any value here means a bot filled
  // every field it could find. Optional because a real submission never
  // sets it.
  website: z.string().optional(),
  // Set by the client to the moment the form first rendered: the
  // minimum-time-on-form check (§9) compares this against server time at
  // submission, not a client-reported elapsed duration, so it can't be
  // spoofed by a bot that just submits a large number.
  formRenderedAt: z.string().datetime(),
});

export type SubmitContactMessageDto = z.infer<typeof submitContactMessageDtoSchema>;
