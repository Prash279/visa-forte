CREATE TABLE "candoc_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"analyzed_at" timestamp,
	"completed_at" timestamp,
	"raw_findings" jsonb,
	"annotated_findings" jsonb,
	"signoff_checklist" jsonb,
	"report_blob_url" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candoc_reviews" ADD CONSTRAINT "candoc_reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candoc_reviews_client_version_idx" ON "candoc_reviews" USING btree ("client_id","version");