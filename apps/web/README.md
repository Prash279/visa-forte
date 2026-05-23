# apps/web — Visa Forte Next.js Application

The main web application for visaforte.com. Built with Next.js 15 App Router, TypeScript strict mode, Tailwind CSS v4, and Better Auth.

---

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx          Root layout — fonts, global CSS
│   ├── globals.css         Brand tokens (:root vars), body background, Tailwind import
│   ├── page.tsx            Landing page ("use client" — scroll animations)
│   ├── home.css            All landing page CSS (imported by page.tsx — render-blocking)
│   ├── login/              Login page
│   ├── signup/             Signup page
│   ├── admin/              Admin dashboard (server component — restricted to prashant@visaforte.com)
│   ├── logout/             Sign-out route
│   └── api/auth/           Better Auth API routes
├── lib/
│   ├── auth.ts             Better Auth server config
│   ├── auth-client.ts      Better Auth client config
│   └── db.ts               Drizzle ORM client
└── db/
    ├── schema.ts           Database schema (users, session, account, verification)
    └── migrations/         Drizzle migration files
```

---

## Key Architecture Decisions

**CSS loading:** All landing page CSS lives in `home.css` and is imported at the top of `page.tsx`. This makes it render-blocking (loaded before first paint). CSS must never be placed in a `<style jsx global>` block inside a `"use client"` component — that causes a Flash of Unstyled Content (FOUC) because styled-jsx in client components is injected via JavaScript, not SSR.

**Brand CSS variables:** Defined in both `globals.css` (for render-blocking availability) and `home.css` (for page-level use). Never define only in a component's scoped styles.

**Admin restriction:** The `/admin` server component checks `session.user.email` after session validation. Only `prashant@visaforte.com` is allowed through. All other valid sessions are redirected to `/login`.

**Mailto CTAs:** All "Request Triage" buttons use an `onClick` handler that builds the mailto URL via `encodeURIComponent` and sets `window.location.href`. Long mailto URLs must never be hardcoded in `href` — browsers silently drop them.

---

## Environment Variables

```env
DATABASE_URL=postgresql://...          # Supabase PostgreSQL connection string
BETTER_AUTH_SECRET=...                 # 32-byte hex secret (openssl rand -hex 32)
NEXT_PUBLIC_SITE_URL=https://visaforte.com
```

---

## Dev Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npx drizzle-kit migrate   # Apply DB migrations (run once with real DATABASE_URL)
```

---

## Deployment

Auto-deploys to Vercel on push to `main`. No manual steps needed. Environment variables are set in the Vercel project dashboard.