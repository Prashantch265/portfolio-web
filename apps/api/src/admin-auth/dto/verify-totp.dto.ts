import { z } from "zod";

export const verifyTotpDtoSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "must be a 6-digit code"),
});

export type VerifyTotpDto = z.infer<typeof verifyTotpDtoSchema>;
