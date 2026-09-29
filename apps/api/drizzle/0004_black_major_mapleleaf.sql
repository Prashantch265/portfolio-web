CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"derivatives" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
