CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"service_interest" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
