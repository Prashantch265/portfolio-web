import { date, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const analyticsEventType = pgEnum("analytics_event_type", [
  "pageview",
  "read_depth",
  "diagram_node",
  "cv_request",
  "outbound_click",
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: analyticsEventType("type").notNull(),
  path: text("path").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  // Daily-rotating, salted hash of IP+user-agent (backend PRD §10) —
  // never the raw IP, never persisted anywhere else either.
  sessionHash: text("session_hash").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsDailyAggregates = pgTable(
  "analytics_daily_aggregates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    type: analyticsEventType("type").notNull(),
    path: text("path").notNull(),
    // Extra grouping key beyond (date, type, path) — currently only
    // diagram_node events use it (the node id). Without this, rolling up
    // raw events into daily aggregates and purging them (§10) would
    // collapse diagram_node attention to page-level, losing exactly the
    // per-node signal §10 calls out as the useful part of that event
    // type. Empty string, not null: a unique index treats two NULLs as
    // distinct, which would defeat the upsert below for every
    // non-diagram_node row.
    dimension: text("dimension").notNull().default(""),
    count: integer("count").notNull().default(0),
  },
  (table) => [uniqueIndex("analytics_daily_aggregates_unique_idx").on(table.date, table.type, table.path, table.dimension)],
);
