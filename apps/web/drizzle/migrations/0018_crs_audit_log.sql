CREATE TABLE "crs_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rules_version" text NOT NULL,
	"total" integer NOT NULL,
	"sections" jsonb NOT NULL,
	"streams_eligible" jsonb NOT NULL,
	"generated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
