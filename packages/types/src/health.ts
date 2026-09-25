import { z } from "zod";

/**
 * GET /api/health — liveness. Touches nothing external; if the process
 * can respond at all, this is what it returns.
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/**
 * GET /api/ready — readiness. Backend PRD §12: checks Postgres/Redis
 * connectivity, returns 503 with the per-dependency breakdown when
 * either check fails rather than a bare boolean.
 */
export const readyResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({
    postgres: z.boolean(),
    redis: z.boolean(),
  }),
});
export type ReadyResponse = z.infer<typeof readyResponseSchema>;
