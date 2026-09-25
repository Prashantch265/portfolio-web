import { envSchema, type Env } from "@portfolio/types";

/**
 * Passed to ConfigModule.forRoot({ validate }). A missing or malformed
 * required key fails the process at startup (backend PRD §16) rather
 * than surfacing as a confusing runtime error the first time it's read.
 */
export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
