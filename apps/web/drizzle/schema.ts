import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

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
  resumeUrl: text('resume_url'),                             // base64 data URI of uploaded resume
  resumeFilename: text('resume_filename'),                   // original filename of uploaded resume
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
// A booking is only inserted AFTER Razorpay payment is verified server-side.
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  serviceTier: text('service_tier').notNull(),
  bookingDate: text('booking_date').notNull(),          // ISO date string, e.g. "2026-04-20"
  query: text('query').notNull(),                       // Client's question / consultation topic
  // Payment fields — populated after Razorpay verification
  razorpayOrderId: text('razorpay_order_id').notNull().default(''),
  razorpayPaymentId: text('razorpay_payment_id').notNull().default(''),
  currency: text('currency').notNull().default('INR'),  // 'INR' | 'USD'
  amountPaid: integer('amount_paid').notNull().default(0), // in smallest unit: paise (INR) or cents (USD)
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid'
  status: text('status').notNull().default('pending'),  // 'pending' | 'confirmed' | 'cancelled'
  // Portal activation — generated after payment, cleared after first use (single-use)
  portalToken: text('portal_token').unique(),
  portalTokenExpiresAt: timestamp('portal_token_expires_at'),
  // Tracks whether the 24-hour reminder email has been sent for this booking
  reminderSent: boolean('reminder_sent').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;

// Active client records managed in the CRM. Separate from leads (raw enquiries).
// A client row is created when Prash promotes a lead or manually adds a client.
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  serviceTier: text('service_tier').notNull(),
  stage: text('stage').notNull().default('Lead'),     // one of 9 CRM stages
  notes: text('notes'),                               // Prash's private notes — never client-visible
  // Links a CRM record to a Better Auth user account (nullable — not every client needs portal access)
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  // DPDP compliance: explicit consent captured at data collection point
  consentGiven: boolean('consent_given').notNull().default(false),
  consentGivenAt: timestamp('consent_given_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Client = typeof clients.$inferSelect;

// Documents uploaded per client and stored in Vercel Blob.
// blobUrl is a private Vercel Blob URL — never returned directly to the browser.
// Downloads are served via a signed server-side route.
export const clientDocuments = pgTable('client_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),       // original filename, e.g. "passport.pdf"
  blobUrl: text('blob_url').notNull(),        // private Vercel Blob URL
  // Checklist slot this document fills (null for admin-uploaded documents)
  docType: text('doc_type'),                  // e.g. "passport", "ielts_certificate"
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export type ClientDocument = typeof clientDocuments.$inferSelect;

// Messages exchanged between Prash (admin) and a client.
// senderRole distinguishes who sent each message; senderId is the admin email or
// the Better Auth user.id for clients.
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  senderRole: text('sender_role').notNull(), // 'admin' | 'client'
  senderId: text('sender_id').notNull(),     // admin email or Better Auth user.id
  body: text('body').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),              // nullable — set when the recipient opens the thread
  attachmentUrl: text('attachment_url'),     // nullable — private Vercel Blob URL for file attachments
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;

// DPDP data deletion requests submitted by clients from their portal.
// One pending request per client at a time — enforced at the API layer.
export const deletionRequests = pgTable('deletion_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  adminNotes: text('admin_notes'),                     // nullable — Prash's response note
  processedAt: timestamp('processed_at'),              // nullable — set when approved or rejected
});

export type DeletionRequest = typeof deletionRequests.$inferSelect;

// Immutable audit trail for compliance events.
// Written by the deletion cron, admin approval actions, and transcript downloads.
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  event: text('event').notNull(), // 'client_deleted' | 'transcript_downloaded' | 'deletion_requested' | 'deletion_approved' | 'deletion_rejected'
  actorId: text('actor_id'),      // admin email or 'cron'
  targetClientId: uuid('target_client_id'), // nullable
  metadata: jsonb('metadata'),    // e.g. { filesDeleted: 12, reason: "retention_policy" }
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// Application monitoring for clients in Submitted or Decision Pending stages.
// One record per client — upserted via the admin monitoring page.
export const applicationMonitoring = pgTable('application_monitoring', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }).unique(),
  aorNumber: text('aor_number'),
  submittedAt: text('submitted_at').notNull(),           // ISO date string YYYY-MM-DD
  expectedDecisionDate: text('expected_decision_date'),  // nullable
  lastStatusCheck: text('last_status_check'),            // nullable
  irccPortalStatus: text('ircc_portal_status'),          // nullable free-text
  monitoringNotes: text('monitoring_notes'),             // nullable — never client-visible
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ApplicationMonitoring = typeof applicationMonitoring.$inferSelect;

// Individual IRCC queries (ADR, Medical Update, etc.) logged against a client.
// Multiple per client. Status: 'Open' | 'Responded' | 'Overdue'.
export const irccQueries = pgTable('ircc_queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  queryType: text('query_type').notNull(),               // e.g. "Additional Documents Request"
  receivedAt: text('received_at').notNull(),             // ISO date string YYYY-MM-DD
  responseDeadline: text('response_deadline').notNull(), // ISO date string YYYY-MM-DD
  responseSubmittedAt: text('response_submitted_at'),    // nullable
  status: text('status').notNull().default('Open'),      // 'Open' | 'Responded' | 'Overdue'
  notes: text('notes'),                                  // nullable
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type IrccQuery = typeof irccQueries.$inferSelect;

// Express Entry draw history scraped from canada.ca.
// Append-only — new draws are inserted; existing rows are never updated.
// Unique constraint on (draw_date, draw_type) prevents duplicate inserts on re-scrapes.
export const eeDraws = pgTable('ee_draws', {
  id: uuid('id').defaultRandom().primaryKey(),
  drawDate: text('draw_date').notNull(),            // ISO date string YYYY-MM-DD
  drawType: text('draw_type').notNull(),            // e.g. "Canadian Experience Class"
  cutoffScore: integer('cutoff_score').notNull(),
  invitations: integer('invitations').notNull(),
  scrapedAt: timestamp('scraped_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('ee_draws_date_type_idx').on(table.drawDate, table.drawType),
]);

export type EeDraw = typeof eeDraws.$inferSelect;

// Latest-value snapshots for canada.ca data that changes infrequently.
// One row per data_key. The scraper does an upsert — payload is always the current value.
// Keys: 'processing_times' | 'proof_of_funds' | 'fee_schedule'
export const canadaDataSnapshots = pgTable('canada_data_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  dataKey: text('data_key').notNull().unique(),     // stable machine key identifying the data type
  payload: jsonb('payload').notNull(),              // full structured payload (matches existing JSON shapes)
  sourceUrl: text('source_url').notNull(),
  lastScraped: timestamp('last_scraped').notNull().defaultNow(),
});

export type CanadaDataSnapshot = typeof canadaDataSnapshots.$inferSelect;
