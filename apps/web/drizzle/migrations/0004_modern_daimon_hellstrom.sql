ALTER TABLE "bookings" ADD COLUMN "razorpay_order_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "razorpay_payment_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "amount_paid" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_status" text DEFAULT 'pending' NOT NULL;