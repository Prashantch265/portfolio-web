import { z } from "zod";

export const upsertPageDtoSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export type UpsertPageDto = z.infer<typeof upsertPageDtoSchema>;
