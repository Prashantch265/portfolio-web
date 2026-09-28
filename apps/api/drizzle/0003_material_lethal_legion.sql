CREATE TYPE "public"."revision_entity_type" AS ENUM('project', 'caseStudySection', 'post', 'page', 'diagram');--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "revision_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagrams" ADD COLUMN "draft_data" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "draft_data" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "draft_data" jsonb;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_author_id_admin_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisions_entity_idx" ON "revisions" USING btree ("entity_type","entity_id","created_at");