import type { ZodIssue } from "zod";

/**
 * Shared by ZodValidationPipe (request-boundary validation) and any
 * service that has to validate a value whose schema depends on data the
 * pipe can't see up front (e.g. a route param picks which schema
 * applies) — same {field: [messages]} shape either way, so
 * ValidationException.source is consistent regardless of where the
 * check happened.
 */
export function zodIssuesToSource(issues: ZodIssue[]): Record<string, string[]> {
  const source: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.join(".") || "_root";
    (source[path] ??= []).push(issue.message);
  }
  return source;
}
