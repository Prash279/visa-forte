CREATE TABLE "canada_data_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"source_url" text NOT NULL,
	"last_scraped" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "canada_data_snapshots_data_key_unique" UNIQUE("data_key")
);
--> statement-breakpoint
CREATE TABLE "ee_draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draw_date" text NOT NULL,
	"draw_type" text NOT NULL,
	"cutoff_score" integer NOT NULL,
	"invitations" integer NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ee_draws_date_type_idx" ON "ee_draws" USING btree ("draw_date","draw_type");