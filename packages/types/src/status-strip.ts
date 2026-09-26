import { z } from "zod";

/**
 * Frontend PRD §6.2 hard rule: every value must be real and checkable,
 * or omitted — never invented. Uptime is deliberately not a field here
 * (dropped as the least meaningful / hardest to keep honestly current
 * in a static build).
 */
export const statusStripSchema = z.object({
  build: z.enum(["passing", "failing"]),
  lastDeploy: z.string().min(1), // ISO date
});

export type StatusStrip = z.infer<typeof statusStripSchema>;
