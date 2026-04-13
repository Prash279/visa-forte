import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

// Better Auth requires these exact fields on the user table.
// The 'id' column uses text (not uuid) because Better Auth generates its own random string IDs.
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  // Visa Forte custom fields
  role: text('role').notNull().default('client'),       // 'admin' | 'client'
  status: text('status').notNull().default('active'),   // 'active' | 'suspended'
  consentGivenAt: timestamp('consent_given_at'),
});

// Better Auth stores one session row per active login.
export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// Better Auth stores credential (password hash) and OAuth tokens here.
export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'), // bcrypt hash for email/password auth
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

// Better Auth uses this for email verification and password-reset tokens.
export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export type User = typeof users.$inferSelect;

// Prospect leads submitted via the /intake form.
// Each row is a potential client who has expressed interest in a service tier.
export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),                                       // optional
  serviceInterest: text('service_interest').notNull(),        // one of the 8 service tier names
  notes: text('notes'),                                       // optional free-text from the prospect
  status: text('status').notNull().default('new'),            // 'new' | 'contacted' | 'converted'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;

// Dates that Prash has marked as available for client bookings.
// Stored as ISO date strings (YYYY-MM-DD) to avoid timezone drift.
export const availability = pgTable('availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull().unique(),           // e.g. "2026-04-20"
  isAvailable: boolean('is_available').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Availability = typeof availability.$inferSelect;

// Bookings submitted by clients via the /booking page.
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  serviceTier: text('service_tier').notNull(),
  bookingDate: text('booking_date').notNull(),     // ISO date string, e.g. "2026-04-20"
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'cancelled'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
