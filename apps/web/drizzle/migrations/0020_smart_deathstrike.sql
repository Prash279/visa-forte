CREATE TABLE "ita_countdown_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"ita_date" text NOT NULL,
	"citizenship_country" text NOT NULL,
	"residence_countries" jsonb NOT NULL,
	"has_spouse" boolean DEFAULT false NOT NULL,
	"num_dependent_children" integer DEFAULT 0 NOT NULL,
	"tier" text NOT NULL,
	"token" uuid NOT NULL,
	"razorpay_order_id" text DEFAULT '' NOT NULL,
	"razorpay_payment_id" text DEFAULT '' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ita_countdown_orders_token_unique" UNIQUE("token")
);
