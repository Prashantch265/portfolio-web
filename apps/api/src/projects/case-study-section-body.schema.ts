import { z } from "zod";
import { projectDecisionSchema } from "@portfolio/types";
import * as schema from "../db/schema/index.js";

export type CaseStudySectionKind = (typeof schema.caseStudySectionKind.enumValues)[number];

/**
 * Each kind has a genuinely different body shape (see the schema
 * module comment in db/schema/index.ts) — this is the one place both
 * the seed script's shape and the admin write path agree on it.
 */
export const caseStudySectionBodySchemas: Record<CaseStudySectionKind, z.ZodTypeAny> = {
  context: z.string().min(1),
  constraints: z.array(z.string().min(1)).min(1),
  decisions: z.array(projectDecisionSchema).min(1),
  outcome: z.string().min(1),
};

export function isCaseStudySectionKind(value: string): value is CaseStudySectionKind {
  return (schema.caseStudySectionKind.enumValues as readonly string[]).includes(value);
}
