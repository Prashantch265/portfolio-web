import { z } from "zod";

/**
 * Deliberately NOT wired through the global ZodValidationPipe (backend
 * PRD §10: "malformed or out-of-taxonomy event types are silently
 * dropped, not errored"). The controller takes the raw body as
 * `unknown` and the service safe-parses it itself — a failed parse is
 * just treated as "nothing to ingest," never a 422 thrown back at a
 * visitor's browser over a fire-and-forget beacon.
 */
export const ingestEventDtoSchema = z.object({
  type: z.enum(["pageview", "read_depth", "diagram_node", "cv_request", "outbound_click"]),
  path: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type IngestEventDto = z.infer<typeof ingestEventDtoSchema>;
