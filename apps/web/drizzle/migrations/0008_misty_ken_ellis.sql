ALTER TABLE "bookings" ADD COLUMN "portal_token" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "portal_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_portal_token_unique" UNIQUE("portal_token");