CREATE TYPE "public"."analytics_event_type" AS ENUM('pageview', 'read_depth', 'diagram_node', 'cv_request', 'outbound_click');--> statement-breakpoint
CREATE TABLE "analytics_daily_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"type" "analytics_event_type" NOT NULL,
	"path" text NOT NULL,
	"dimension" text DEFAULT '' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "analytics_event_type" NOT NULL,
	"path" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_hash" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_aggregates_unique_idx" ON "analytics_daily_aggregates" USING btree ("date","type","path","dimension");