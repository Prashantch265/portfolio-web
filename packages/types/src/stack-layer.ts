import { z } from "zod";

/**
 * Inverted skill index — no proficiency bars (frontend PRD §2.4 anti-
 * pattern list). Each item names which projects actually proved it,
 * joined by slug.
 */
export const stackItemSchema = z.object({
  name: z.string().min(1),
  projects: z.array(z.string().min(1)), // project slugs
  note: z.string().min(1),
});

export const stackLayerSchema = z.object({
  layer: z.string().min(1),
  items: z.array(stackItemSchema),
});

export type StackItem = z.infer<typeof stackItemSchema>;
export type StackLayer = z.infer<typeof stackLayerSchema>;
