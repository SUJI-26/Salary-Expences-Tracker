CREATE TABLE "backups" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"reason" text NOT NULL,
	"months" integer DEFAULT 0 NOT NULL,
	"expenses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_data" (
	"user_id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "backups_user_created_idx" ON "backups" ("user_id","created_at");