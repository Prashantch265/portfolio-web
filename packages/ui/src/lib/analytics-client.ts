export type AnalyticsEventType = "pageview" | "read_depth" | "diagram_node" | "cv_request" | "outbound_click";

/**
 * Fire-and-forget POST /api/analytics/event (backend PRD §10, shipped).
 * Same-origin via Traefik; no credentials or 401-retry machinery, since
 * this route sits outside the admin session entirely. Never throws and
 * never awaited by the caller — a lost beacon is tolerated by design on
 * both ends (the ingest endpoint itself never errors a visitor over a
 * non-critical write, §10).
 *
 * Lives in packages/ui, not apps/web, specifically so Footer's own
 * outbound_click handler can call it without apps/web depending on
 * packages/ui or vice versa in the wrong direction.
 */
export function trackEvent(type: AnalyticsEventType, path: string, metadata?: Record<string, unknown>): void {
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, path, metadata }),
  }).catch(() => {
    /* fire-and-forget — a lost beacon is not an error */
  });
}
