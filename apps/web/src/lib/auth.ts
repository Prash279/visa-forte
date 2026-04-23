import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, sessions, accounts, verifications } from "../../drizzle/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "https://visaforte.com",
    "https://www.visaforte.com",
  ],
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    // Map all four Better Auth tables to our Drizzle schema objects.
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  rateLimit: {
    enabled: true,
    max: 8,
    window: 60,
  },
});
