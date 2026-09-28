CREATE TYPE "public"."case_study_section_kind" AS ENUM('context', 'constraints', 'decisions', 'outcome');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."cv_section_kind" AS ENUM('experience', 'education', 'skills', 'certifications', 'accomplishments');--> statement-breakpoint
CREATE TYPE "public"."cv_section_visibility" AS ENUM('public', 'gated');--> statement-breakpoint
CREATE TYPE "public"."diagram_owner_type" AS ENUM('project', 'standalone');--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('project', 'post');--> statement-breakpoint
CREATE TABLE "case_study_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "case_study_section_kind" NOT NULL,
	"body" jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headline" text NOT NULL,
	"location" text NOT NULL,
	"years_experience" text NOT NULL,
	"summary_public" text NOT NULL,
	"summary_gated" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cv_profile_id" uuid NOT NULL,
	"kind" "cv_section_kind" NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"date_range" text,
	"body" text,
	"visibility" "cv_section_visibility" DEFAULT 'public' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "diagram_owner_type" DEFAULT 'project' NOT NULL,
	"owner_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"groups" jsonb,
	"text_equivalent" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"published_at" timestamp with time zone,
	"reading_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kicker" text NOT NULL,
	"summary" text NOT NULL,
	"years" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"stack_tags" text[] DEFAULT '{}' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"kind" "tag_kind" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_study_sections" ADD CONSTRAINT "case_study_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_sections" ADD CONSTRAINT "cv_sections_cv_profile_id_cv_profiles_id_fk" FOREIGN KEY ("cv_profile_id") REFERENCES "public"."cv_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_study_sections_project_kind_idx" ON "case_study_sections" USING btree ("project_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "diagrams_owner_idx" ON "diagrams" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_label_kind_idx" ON "tags" USING btree ("label","kind");