CREATE TYPE "public"."cv_access_grant_status" AS ENUM('pending', 'approved', 'issued', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "cv_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text,
	"status" "cv_access_grant_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone
);
