CREATE TABLE "application_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"aor_number" text,
	"submitted_at" text NOT NULL,
	"expected_decision_date" text,
	"last_status_check" text,
	"ircc_portal_status" text,
	"monitoring_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_monitoring_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "ircc_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"query_type" text NOT NULL,
	"received_at" text NOT NULL,
	"response_deadline" text NOT NULL,
	"response_submitted_at" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_monitoring" ADD CONSTRAINT "application_monitoring_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ircc_queries" ADD CONSTRAINT "ircc_queries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;