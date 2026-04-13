-- Adds query column to bookings. DEFAULT '' handles any existing test rows.
ALTER TABLE "bookings" ADD COLUMN "query" text NOT NULL DEFAULT '';
