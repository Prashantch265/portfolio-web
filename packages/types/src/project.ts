import { z } from "zod";
import { diagramDocSchema } from "./diagram.js";

/**
 * Matches mockups/schematic/assets/data.js's real project shape, with two
 * fixes over the mockup:
 * - `decisions[].emphasis` replaces the mockup's positional `i === 1` hack
 *   that decided which decision rendered as a callout.
 * - `prevSlug`/`nextSlug` are NOT part of this schema — the mockup
 *   hand-authored them and they were inconsistent (e.g. one project's
 *   `nextSlug` didn't point back via the target's `prevSlug`). The
 *   content-source adapter derives them from array order instead.
 */
export const projectDecisionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  emphasis: z.boolean().default(false),
});

export const projectSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  kicker: z.string().min(1),
  summary: z.string().min(1),
  years: z.string().min(1),
  featured: z.boolean(),
  stack: z.array(z.string().min(1)),
  diagram: diagramDocSchema.nullable(),
  context: z.string().min(1),
  constraints: z.array(z.string().min(1)),
  decisions: z.array(projectDecisionSchema),
  outcome: z.string().min(1),
});

export type ProjectDecision = z.infer<typeof projectDecisionSchema>;
export type Project = z.infer<typeof projectSchema>;

/** Project + derived prev/next, computed by the content-source adapter from array order. */
export type ProjectWithNav = Project & { prevSlug: string | null; nextSlug: string | null };
