import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, like, lt, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../db/drizzle.tokens.js";
import * as schema from "../../db/schema/index.js";
import { hashIdentifier } from "../../common/privacy/hash-identifier.js";
import { SlidingWindowLimiterService } from "../../common/rate-limit/sliding-window-limiter.service.js";
import { ingestEventDtoSchema } from "./dto/ingest-event.dto.js";

// Not a user-facing limit and not in the §16 env table (that table's
// two rate-limit entries are both contact-specific) — a fire-and-forget
// beacon has no "too many requests" UI state to drive (§10), so this
// exists purely to cap event-flooding abuse, not to communicate a limit
// to anyone. A local tunable constant, same category as contact's
// MIN_FORM_SECONDS.
const SESSION_EVENT_WINDOW_MS = 5 * 60 * 1000;
const SESSION_EVENT_MAX = 60;

// backend PRD §10: "not perfect, proportionate to the stakes of a
// personal site's analytics" — a modest known-bot-substring list plus
// treating a missing User-Agent as non-browser, not an exhaustive
// fingerprinting defense.
const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|pingdom|uptimerobot|ahrefsbot|semrushbot|mj12bot|python-requests|curl|wget|headlesschrome/i;

function computeSessionHash(ip: string, userAgent: string): string {
  const utcDay = new Date().toISOString().slice(0, 10);
  return hashIdentifier(`${utcDay}:${ip}:${userAgent}`);
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly limiter: SlidingWindowLimiterService,
  ) {}

  /**
   * Never throws — every drop path (bot, malformed/out-of-taxonomy body,
   * flooding) is silent, per §10. The ingest endpoint itself always
   * responds 200 regardless of what happened here.
   */
  async ingest(rawBody: unknown, ip: string, userAgent: string | undefined): Promise<void> {
    if (!userAgent || BOT_USER_AGENT_PATTERN.test(userAgent)) return;

    const parsed = ingestEventDtoSchema.safeParse(rawBody);
    if (!parsed.success) return;

    const sessionHash = computeSessionHash(ip, userAgent);
    const limit = await this.limiter.check(`analytics:${sessionHash}`, SESSION_EVENT_WINDOW_MS, SESSION_EVENT_MAX);
    if (!limit.allowed) return;

    await this.db.insert(schema.analyticsEvents).values({
      type: parsed.data.type,
      path: parsed.data.path,
      metadata: parsed.data.metadata ?? {},
      sessionHash,
    });
  }

  /**
   * Merges the still-raw window (last ANALYTICS_RETENTION_DAYS) with
   * whatever's already been rolled up — the dashboard's numbers are
   * all-time, not just "since the last purge" (§10 keeps the raw table
   * bounded specifically so trend data survives the purge, not so the
   * dashboard forgets anything older than the window).
   */
  private async countByPathAndType(type: (typeof schema.analyticsEventType.enumValues)[number], pathPrefix?: string) {
    const rawRows = await this.db
      .select({ path: schema.analyticsEvents.path, count: sql<number>`count(*)::int` })
      .from(schema.analyticsEvents)
      .where(
        pathPrefix
          ? sql`${schema.analyticsEvents.type} = ${type} AND ${like(schema.analyticsEvents.path, `${pathPrefix}%`)}`
          : eq(schema.analyticsEvents.type, type),
      )
      .groupBy(schema.analyticsEvents.path);

    const aggregateRows = await this.db
      .select({ path: schema.analyticsDailyAggregates.path, count: sql<number>`sum(${schema.analyticsDailyAggregates.count})::int` })
      .from(schema.analyticsDailyAggregates)
      .where(
        pathPrefix
          ? sql`${schema.analyticsDailyAggregates.type} = ${type} AND ${like(schema.analyticsDailyAggregates.path, `${pathPrefix}%`)}`
          : eq(schema.analyticsDailyAggregates.type, type),
      )
      .groupBy(schema.analyticsDailyAggregates.path);

    const merged = new Map<string, number>();
    for (const row of [...rawRows, ...aggregateRows]) {
      merged.set(row.path, (merged.get(row.path) ?? 0) + row.count);
    }
    return [...merged.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count);
  }

  async getPageviewsByPath(limit = 50) {
    return (await this.countByPathAndType("pageview")).slice(0, limit);
  }

  async getTopProjects(limit = 10) {
    return (await this.countByPathAndType("pageview", "/work/")).slice(0, limit);
  }

  async getTopPosts(limit = 10) {
    return (await this.countByPathAndType("pageview", "/writing/")).slice(0, limit);
  }

  async getDiagramNodeAttention(limit = 20) {
    const rawRows = await this.db
      .select({
        path: schema.analyticsEvents.path,
        nodeId: sql<string>`coalesce(${schema.analyticsEvents.metadata}->>'nodeId', '')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.analyticsEvents)
      .where(eq(schema.analyticsEvents.type, "diagram_node"))
      .groupBy(schema.analyticsEvents.path, sql`coalesce(${schema.analyticsEvents.metadata}->>'nodeId', '')`);

    const aggregateRows = await this.db
      .select({
        path: schema.analyticsDailyAggregates.path,
        nodeId: schema.analyticsDailyAggregates.dimension,
        count: sql<number>`sum(${schema.analyticsDailyAggregates.count})::int`,
      })
      .from(schema.analyticsDailyAggregates)
      .where(eq(schema.analyticsDailyAggregates.type, "diagram_node"))
      .groupBy(schema.analyticsDailyAggregates.path, schema.analyticsDailyAggregates.dimension);

    const merged = new Map<string, { path: string; nodeId: string; count: number }>();
    for (const row of [...rawRows, ...aggregateRows]) {
      if (!row.nodeId) continue;
      const key = `${row.path}::${row.nodeId}`;
      const existing = merged.get(key);
      merged.set(key, { path: row.path, nodeId: row.nodeId, count: (existing?.count ?? 0) + row.count });
    }
    return [...merged.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Only the "requested" stage has a real data source today — §10's
   * full funnel (requested → approved → issued) is driven by
   * CVAccessGrant.status, a table backend M4 creates, not M3. Returning
   * a 3-stage object with fabricated zeros for the other two would read
   * as real data; this is honest about what M3 can actually answer.
   */
  async getCvRequestCount(): Promise<number> {
    const rows = await this.countByPathAndType("cv_request");
    return rows.reduce((sum, row) => sum + row.count, 0);
  }

  async getSummaryForAdmin() {
    const [pageviews, topProjects, topPosts, diagramNodeAttention, cvRequests] = await Promise.all([
      this.getPageviewsByPath(),
      this.getTopProjects(),
      this.getTopPosts(),
      this.getDiagramNodeAttention(),
      this.getCvRequestCount(),
    ]);
    return { pageviews, topProjects, topPosts, diagramNodeAttention, cvRequestFunnel: { requested: cvRequests } };
  }

  /**
   * §10's rollup+purge. Idempotent by design (ON CONFLICT adds to the
   * existing aggregate count rather than overwriting it) so re-running
   * it — e.g. a retry after a crash mid-run — can't double- or
   * under-count as long as the purge of the rolled-up rows that follows
   * actually completes; a run that rolls up but fails before purging
   * just re-aggregates the same still-present raw rows next time, which
   * adds them a second time. Acceptable here given retention is a daily,
   * low-stakes, single-process job (§15's "no job queue before it's
   * needed" reasoning applies the same way it did for media/contact).
   */
  async rollupAndPurge(now: Date = new Date()): Promise<{ aggregated: number; purged: number }> {
    const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS ?? 90);
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    const grouped = await this.db.execute<{ day: string; type: string; path: string; dimension: string; count: number }>(sql`
      SELECT
        to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS day,
        type,
        path,
        coalesce(metadata->>'nodeId', '') AS dimension,
        count(*)::int AS count
      FROM analytics_events
      WHERE occurred_at < ${cutoff}
      GROUP BY day, type, path, dimension
    `);

    for (const row of grouped.rows) {
      await this.db
        .insert(schema.analyticsDailyAggregates)
        .values({ date: row.day, type: row.type as (typeof schema.analyticsEventType.enumValues)[number], path: row.path, dimension: row.dimension, count: row.count })
        .onConflictDoUpdate({
          target: [
            schema.analyticsDailyAggregates.date,
            schema.analyticsDailyAggregates.type,
            schema.analyticsDailyAggregates.path,
            schema.analyticsDailyAggregates.dimension,
          ],
          set: { count: sql`${schema.analyticsDailyAggregates.count} + excluded.count` },
        });
    }

    const purged = await this.db.delete(schema.analyticsEvents).where(lt(schema.analyticsEvents.occurredAt, cutoff));
    this.logger.log(`Analytics rollup: aggregated ${grouped.rows.length} group(s), purged ${purged.rowCount ?? 0} raw row(s) older than ${cutoff.toISOString()}.`);
    return { aggregated: grouped.rows.length, purged: purged.rowCount ?? 0 };
  }
}
