import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../drizzle/schema';

// Preserve the connection pool across Next.js hot reloads in development.
// Without this, every file save tears down and rebuilds the TCP connection
// to Neon, causing 3–8s cold-connect latency on the first request after
// each edit. globalThis survives HMR; a fresh pool is only created on
// actual server restart.
const globalDb = globalThis as typeof globalThis & {
  _pgClient?: ReturnType<typeof postgres>;
};

const client = globalDb._pgClient ?? postgres(process.env.DATABASE_URL!, {
  prepare: false, // required for Supabase pgBouncer pooler
  max: 1,         // one connection per serverless function instance
});
if (process.env.NODE_ENV !== 'production') globalDb._pgClient = client;

export const db = drizzle(client, { schema });
