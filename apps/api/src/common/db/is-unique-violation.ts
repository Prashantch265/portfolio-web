const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Drizzle surfaces the raw `pg` driver error as-is — this is the one place that knows its shape. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === POSTGRES_UNIQUE_VIOLATION
  );
}
