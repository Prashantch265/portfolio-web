import { z } from "zod";

export const upsertTagDtoSchema = z.object({
  label: z.string().min(1),
  kind: z.enum(["project", "post"]),
});

export type UpsertTagDto = z.infer<typeof upsertTagDtoSchema>;
