# BUILD_LOG

Living record of what was actually built. Append in later sessions; do not rewrite history.

---

## 2026-09-03 — Phase 0 & Phase 1 (Architecture, identity, School Settings)

### Phase 0 — Architecture & Environment Foundations

- **Multi-tenancy ADR:** [docs/adr/001-multi-tenancy.md](docs/adr/001-multi-tenancy.md) — shared Postgres, shared schema, `schoolId` on tenant tables; app-layer isolation now; RLS deferred to Phase 8.
- **Next.js App Router (TypeScript)** with route groups:
  - `(marketing)` — public home (`/`)
  - `(tenant)` — staff app (`/login`, `/dashboard`, `/settings/school`, `/staff/invite`, `/reset-password`, `/accept-invite`)
  - `(platform)` — SUPER_ADMIN stub (`/admin`)
- **Prisma + Postgres:** schema lives at `prisma/schema.prisma` (moved from repo root). Added `directUrl = env("DIRECT_URL")` and Auth.js models `Account`, `Session`, `VerificationToken` pointed at `User`. Initial migration: `prisma/migrations/20260903183052_foundation`.
- **Local Docker Postgres:** `docker-compose.yml` (Postgres 16). Local `DATABASE_URL` and `DIRECT_URL` are the same connection string. `.env.example` documents how to point them at Neon (pooled vs direct) later.
- **Vercel Blob scaffold:** `src/lib/blob/index.ts` and `GET`/`POST` `/api/blob`. Returns `BLOB_NOT_CONFIGURED` until `BLOB_READ_WRITE_TOKEN` is set — no fake credentials.
- **Auth decision:** Auth.js v5 (NextAuth) with **Credentials** + **JWT sessions**. Invite and password reset use the Prisma `VerificationToken` table directly. The Prisma adapter package is installed and Account/Session tables exist so a database-session adapter can be wired later; Credentials + JWT avoids a parallel identity table and works without OAuth providers. Tenant context is the session `schoolId` claim (see ADR). Subdomain helper is stubbed in `src/lib/tenancy/index.ts` (`resolveSlugFromHost`) and not used on localhost.
- **Conventions:**
  - `ActionResult<T>` / `AppError` in `src/lib/errors`
  - JSON-ish `logger` in `src/lib/errors/logger.ts`
  - Tenant data access through `requireTenant()` / `requireStaffSession()` / `requireAction()`
- **Design tokens:** `src/styles/tokens.css` — exact Excellence Kids CSS variables plus base spacing/radius/shadow/glass. UI font: Geist / system / Inter. Serif (`.brand-wordmark`) only for the logotype on the marketing page.
- **Logo:** `public/brand/excellence-kids-logo.svg` is the only brand file wired (navbar, marketing, favicon metadata). The two PNG variants that originally sat at the repo root were not present after scaffolding; product UI uses the SVG per the design language. Re-add PNGs under `public/brand/` later if email/print needs them.
- **CI:** `.github/workflows/ci.yml` — `prisma validate`, generate, migration SQL dry-run, `migrate deploy` on a service Postgres, `next typegen`, `tsc --noEmit`, ESLint.
- **Next.js 16 request interceptor:** `src/proxy.ts` (Auth.js `authorized` callback). This version deprecates `middleware.ts` in favor of `proxy.ts`.

### Phase 1 — Core Tenancy & Identity

- **Seed** (`prisma/seed.ts`): Excellence Kids school (`slug: excellence-kids`), Ghana defaults (GHS, Africa/Accra, Creche–JHS levels), `SchoolSettings`, current academic year `2025/2026` (read-only until Phase 2), `SCHOOL_ADMIN` user.
- **Permissions:** `src/lib/permissions/index.ts` — `UserRole` → actions (`school.settings.*`, `staff.invite`, `platform.admin`).
- **Staff auth:** login, invite-by-email (link logged to the server in local/dev), password reset. Local mailer: `src/lib/mail/index.ts`.
- **School Settings UI:** `/settings/school` — name, address, city, region, contacts, admission/application prefixes, notification toggles; current academic year displayed, not edited.

Default seed admin (change after first login):

- Email: `admin@excellencekids.edu.gh` (or `SEED_ADMIN_EMAIL`)
- Password: `ChangeMeNow1!` (or `SEED_ADMIN_PASSWORD`)

### Folder structure (annotated)

```text
prisma/                 schema, migrations, seed
docker-compose.yml      local Postgres 16
docs/adr/               architecture decision records
.github/workflows/      CI
public/brand/           Excellence Kids SVG logo
src/app/(marketing)/    public site
src/app/(tenant)/       staff app (auth + authenticated)
src/app/(platform)/     future platform admin stub
src/app/api/auth/       Auth.js route handlers
src/app/api/blob/       Blob smoke test
src/components/ui/      StatusBadge, Button, Input, …
src/components/brand/   BrandLogo
src/components/layout/  TenantShell
src/config/brand.ts     product name, colors, logo path
src/lib/db/             Prisma client
src/lib/auth/           Auth.js, session helpers, invite/reset tokens
src/lib/tenancy/        requireTenant + subdomain stub
src/lib/permissions/    role → actions
src/lib/errors/         ActionResult, AppError, logger
src/lib/blob/           Vercel Blob wrappers
src/lib/format/         GHS + Africa/Accra dates
src/lib/mail/           dev log mailer
src/styles/tokens.css   design tokens
src/proxy.ts            Auth.js request gate (Next.js 16 proxy)
```

### New-developer setup

1. Copy `.env.example` to `.env`. Generate `AUTH_SECRET` (`openssl rand -base64 32`). Leave Blob token unset until you have a Vercel Blob store.
2. Start Postgres: `npm run db:up` (Docker).
3. Migrate: `npx prisma migrate deploy` (or `npm run db:migrate` in interactive dev).
4. Generate client if needed: `npm run db:generate`.
5. Seed: `npm run db:seed`.
6. Dev server: `npm run dev` — open http://localhost:3000, sign in at `/login`.
7. Optional Blob proof: set `BLOB_READ_WRITE_TOKEN`, then `POST /api/blob`.

**Neon later:** set `DATABASE_URL` to the pooled connection string and `DIRECT_URL` to the non-pooled (direct) string. Run `npx prisma migrate deploy` against `DIRECT_URL`.

### Intentionally unfinished / stubbed (do not rediscover)

- Phase 2: ClassLevel/Section/Subject management UI and Ghana class-level seed script (year row exists only so Settings can show a current year).
- Phase 3: Admissions module, Document entity validation, real Blob uploads tied to applications, admission fee invoicing.
- Production Neon / Blob / SMTP credentials.
- PNG logo files (transparent / white-bg) — not in `public/brand/` yet.
- Wiring `@auth/prisma-adapter` for database sessions (JWT is used today).
- Platform admin beyond a gated stub page.
- Postgres RLS (Phase 8).
