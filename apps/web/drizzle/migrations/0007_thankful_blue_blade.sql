ALTER TABLE "client_documents" ADD COLUMN "doc_type" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;