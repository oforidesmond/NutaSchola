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

---

## 2026-09-04 — Phase 1 cleanup + Phase 2 (Academic) + Phase 3 (Admissions)

### Step 1 — Loose ends & Neon

- **Icon-only mark:** Exported [`public/brand/excellence-kids-mark.svg`](public/brand/excellence-kids-mark.svg) by cropping the pictorial mark from the full logo SVG (`viewBox="250 70 560 490"`, metadata stripped). Favicon / Apple icon metadata in [`src/app/layout.tsx`](src/app/layout.tsx) and [`src/config/brand.ts`](src/config/brand.ts) now use the mark; full wordmark stays for navbar/marketing ≥120px.
- **PNG logos:** Confirmed already under `public/brand/` (`excellence-kids-logo-transparent.png`, `excellence-kids-logo-white-bg.png`). Kept for email/print; not wired into product chrome. (Prior BUILD_LOG note that they were missing was stale.)
- **White reversed SVG:** Deferred — not blocking; note when print/dark navbar needs it.
- **Neon project link:**
  - Written [`neon.ts`](neon.ts) declaring `nuta-schola` bucket (`public_read`).
  - CLI `neon login` failed in this environment (OAuth session rejected); MCP authenticated to org `org-billowing-smoke-25839896`.
  - Requested project id `super-glitter-41239022` was **not found** (404). Only accessible project: `nameless-sea-88077739` (“Nuta-Database”) in **aws-us-east-1**, branch `production`.
  - MCP `run_sql` confirmed that Neon DB is reachable, but it holds an **unrelated inventory/POS schema** — **do not** run NutaSchola migrations against it.
  - Object Storage `get_storage` → `region_unavailable` (beta requires **us-east-2** on a new project). Real upload round-trip therefore **not verified**. Stub `BLOB_NOT_CONFIGURED` remains when AWS_* vars are unset.
- **Storage pivot:** Replaced Vercel Blob (`@vercel/blob`) with Neon Object Storage via `files-sdk` + `files-sdk/neon` in [`src/lib/blob/index.ts`](src/lib/blob/index.ts). Smoke API [`/api/blob`](src/app/api/blob/route.ts) updated. `.env.example` documents `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` / `AWS_REGION`. Schema comments on `Document.blobUrl` / applicant `photoUrl` updated accordingly.
- Local context file `.neon` pin (gitignored) points at the inventory project for org discovery only — **app runtime still uses Docker Postgres** by default.

### Phase 2 — Academic Structure

- **Seed** ([`prisma/seed.ts`](prisma/seed.ts)): Terms 1–3 for 2025/2026; Ghana class levels Creche → JHS 3 with section `A`; starter subjects; Admission Fee `FeeStructure` (`isAdmissionFee`) with GHS 150 item.
- **Permissions:** `academic.read` / `academic.manage`.
- **Screens:** `/settings/academic` (years/terms + set current), `/settings/classes`, `/settings/subjects`. School settings links to academic management (no longer “Phase 2 read-only”).
- Nav + [`src/proxy.ts`](src/proxy.ts) cover new settings paths.

### Phase 3 — Admissions (primary deliverable)

- **Decision — convert trigger:** Admit **+** admission fee fully paid. Staff may set stage to `ADMITTED` without converting; **Convert to student** is an explicit action that enforces the fee gate, then creates `Student` + current-year `Enrollment`, sets `convertedStudentId`, advances to `ENROLLED` with history.
- **Helpers:** `src/lib/admissions/{stages,history,convert,numbering,guardians,notify,labels}.ts`; Document entity validation via `assertDocumentEntity`.
- **UI:** `ConfirmDialog`, `AdmissionStageTracker` (success/current/future colors; terminal stages freeze + separate `StatusBadge`).
- **Routes:**
  - `/admissions` — dashboard (by stage, by class, inquiry→enrolled rate)
  - `/admissions/applications` — list/search (name, class, stage, source, date range)
  - `/admissions/applications/new` — intake + primary guardian (create-or-link by phone)
  - `/admissions/applications/[id]` — workspace: bio, guardians, docs (Blob upload), stage changes + history, fee invoice/cash payment, convert, soft-delete
- **Notifications:** email via existing dev mailer when `enableEmailNotifications` and primary guardian has email. SMS deferred.
- **Permissions:** `admissions.read|create|update|stage|documents|fees|convert` for officer/front-desk/admin roles as appropriate.

### Folder structure updates

```text
neon.ts                     Neon IaC (nuta-schola bucket)
public/brand/*-mark.svg     icon-only favicon source
src/lib/admissions/         stage map, history, convert, numbering, notify
src/lib/documents/          polymorphic Document validation re-export
src/components/admissions/  AdmissionStageTracker
src/components/ui/ConfirmDialog.tsx
src/app/(tenant)/(authenticated)/settings/{academic,classes,subjects}/
src/app/(tenant)/(authenticated)/admissions/
```

### Setup updates

1. Same local Docker + migrate + seed flow as before (seed now includes levels/terms/subjects/admission fee).
2. Optional Neon Object Storage: create a **new** Neon project in **aws-us-east-2**, `neon link`, ensure `neon.ts` bucket, `neon deploy`, `neon env pull` into `.env.local`, then `POST /api/blob` to prove upload.
3. Do **not** point `DATABASE_URL` at the existing “Nuta-Database” inventory project.

### Intentionally unfinished / deferred

- Phase 4+: student profile depth, enrollment reassignment, parent read-only view.
- Phase 5: integration tests, UAT, duplicate-application detection, production Neon **dedicated** NutaSchola DB + migrate deploy.
- Real Neon Object Storage credentials on us-east-2 (upload not proven in this session).
- SMS gateway; payment gateways (Paystack/Hubtel); general fees UI beyond admission fee.
- Reversed white logo SVG; document delete/replace on detail; inquiry-only lightweight intake (current form starts at `APPLICATION_STARTED`).
- Auth.js Prisma adapter database sessions; platform admin; Postgres RLS (Phase 8).

---

## 2026-09-05 — Neon Object Storage verified

- Wired production-branch S3 credentials into gitignored [`.env.local`](.env.local) (`AWS_ENDPOINT_URL_S3` on `br-weathered-resonance…us-east-2`, region `us-east-2`).
- Confirmed bucket **`nuta-schola`** exists; upload + read round-trip succeeded via AWS S3 client and via the app’s `files-sdk` / `files-sdk/neon` adapter (`scripts/smoke-neon-storage.mjs`, `scripts/smoke-neon-files-sdk.mjs`).
- Document uploads in Admissions can use real storage when the Next.js process loads `.env.local` (restart `npm run dev` if it was already running).

---

## 2026-09-05 — Admissions corrections + shared export

Client corrections on working Phase 0–3 code (not a rebuild). Four sequential changes; only #1 required a Prisma migration.

### 1. Admission stages consolidated to five + three terminals

- **Migration:** [`prisma/migrations/20260905230000_consolidate_admission_stages`](prisma/migrations/20260905230000_consolidate_admission_stages/migration.sql) remaps existing `AdmissionApplication.stage` and `AdmissionStatusHistory.fromStage`/`toStage` (no table truncate).
- **New progression track:** `INQUIRY` → `APPLICATION_SUBMITTED` → `UNDER_REVIEW` → `ADMITTED` → `ENROLLED`.
- **Terminals unchanged:** `WAITLISTED`, `REJECTED`, `WITHDRAWN` (not counted among the five).
- **Old → new mapping:**

| Old | New |
|-----|-----|
| `INQUIRY` | `INQUIRY` |
| `APPLICATION_STARTED` | `APPLICATION_SUBMITTED` |
| `DOCUMENTS_SUBMITTED` | `APPLICATION_SUBMITTED` |
| `UNDER_REVIEW` | `UNDER_REVIEW` |
| `ENTRANCE_ASSESSMENT_SCHEDULED` | `UNDER_REVIEW` |
| `ENTRANCE_ASSESSMENT_COMPLETED` | `UNDER_REVIEW` |
| `INTERVIEW_SCHEDULED` | `UNDER_REVIEW` |
| `ADMITTED` | `ADMITTED` |
| `OFFER_ACCEPTED` | `ADMITTED` |
| `ENROLLED` | `ENROLLED` |
| `WAITLISTED` / `REJECTED` / `WITHDRAWN` | unchanged |

- **SSoT:** [`src/lib/admissions/stages.ts`](src/lib/admissions/stages.ts) exports `ADMISSION_TRACK`, `TERMINAL_STAGES`, `MANUAL_STAGES`, `ALL_FILTER_STAGES`. Tracker, dashboard, list filter, and stage actions consume these — no ad-hoc stage arrays.
- New intake starts at `APPLICATION_SUBMITTED`. Convert requires `ADMITTED` only. Terminal freeze uses last non-terminal history stage.

### 2. Enrollment on partial fee payment

- Convert gate in [`src/lib/admissions/convert.ts`](src/lib/admissions/convert.ts): `invoiceHasAnyPayment` (`amountPaid > 0`) instead of fully paid. Invoice/payment tracking unchanged.
- Fee UI shows “Paid X of Y — Z outstanding” via [`src/lib/admissions/fees.ts`](src/lib/admissions/fees.ts) on applicant workspace, applications list, and a separate dashboard fee strip (invoiced / paid / outstanding).
- **Product call:** Dashboard **by-stage counts remain stage-only**; outstanding fee does not fold into stage buckets.
- Overpayment rejection (`AMOUNT_EXCEEDS_BALANCE`) already existed and remains.

### 3. Configurable admission fee → `/settings/fees`

- Chose **`/settings/fees`** (not academic): academic is years/terms; fee config will grow beyond admissions and must edit the real `FeeStructure`/`FeeItem` flagged `isAdmissionFee` (no parallel `SchoolSettings` field that can drift).
- Permission: `school.settings.update` to save; invoice generation still snapshots amounts at create time so existing invoices stay historical.
- Seed still creates GHS **150.00** as a **starting default only** — editable in UI; not fixed policy.

### 4. Shared reporting / export

- Utility: [`src/lib/reports/`](src/lib/reports/) — CSV (`rowsToCsv`) + branded PDF (`pdfkit` + school name/address + logo PNG).
- Wired today:
  - Admissions list → CSV + PDF (full filtered set)
  - Applicant workspace → PDF summary/receipt
  - Admissions dashboard → CSV (stage/class/conversion + fee totals)
  - Settings classes / subjects / academic → CSV
- **Deferred:** Excel/XLSX; Phase 4+ student/attendance exporters (same utility is ready to plug into); payment-gateway receipts; SMS.

### Intentionally unfinished / deferred (carry-forward)

- Phase 4+: student profile depth, enrollment reassignment, parent read-only view.
- Phase 5: integration tests, UAT, duplicate-application detection, dedicated Neon NutaSchola DB.
- SMS gateway; Paystack/Hubtel; general fees beyond admission fee.
- Document delete/replace; inquiry-only lightweight intake.
- Auth.js Prisma adapter DB sessions; platform admin; Postgres RLS (Phase 8).

---

## 2026-09-06 — Premium UI/UX elevation pass

Visual/structural polish across the staff app. No schema, permission, or admissions workflow semantics changed.

### Shell / navigation

- Replaced flat top nav with a **grouped, icon-led left sidebar** ([`TenantShell.tsx`](src/components/layout/TenantShell.tsx), [`nav.ts`](src/components/layout/nav.ts)): Dashboard; Admissions (Overview, Applications); Settings (School, Academic, Classes, Subjects, Fees); Staff (Invite).
- Pathname **active states** (brand-50 + left accent). Mobile hamburger drawer. Main content `max-w-7xl`.
- Why: flat six-link top nav would not scale to Fees / Attendance / Academics / Communications later.

### Typography

- **Decision:** UI remains Geist / system **sans**; serif stays **wordmark-only** (`.brand-wordmark` on marketing) per design language — do not formalize serif page titles.
- **Bug fixed:** `--font-geist-sans` was set on `<body>` while `html { font-family: … var(--font-geist-sans) … }` ran on `<html>`, so the variable was out of scope, the rule was invalid, and the UA **serif** default painted the whole app (matching screenshots). Fix: variables on `<html>`, `geistSans.className` + body `font-family` with Geist first ([`layout.tsx`](src/app/layout.tsx), [`globals.css`](src/app/globals.css)).

### Global interactive states

- Shared utilities: `surface-*`, `interactive-row`, `interactive-card`, `focus-ring`, `.motion-enter` (respects `prefers-reduced-motion`).
- Button loading spinner + stronger hover/active across variants.

### Shared components

- **`FeeProgress`** ([`FeeProgress.tsx`](src/components/ui/FeeProgress.tsx)) — default + **compact** table variant. Used on: applications list, applicant FeePanel, admissions dashboard fee strip.
- **`Avatar`**, **`Card` / `Breadcrumb` / `Select`**, **`AuthShell`**.
- **`getAdmissionNextAction`** ([`next-action.ts`](src/lib/admissions/next-action.ts)).

### Dependency

- Added **`lucide-react`** for nav, shortcuts, row actions, empty-state affordances.

### Pages restructured

| Page | Change |
|------|--------|
| `/admissions/applications/[id]` | Breadcrumb; single stage badge; tracker without duplicate badge; What’s next card; stage + fee near top; progressive convert; bio/guardians/docs; history; collapsed danger zone |
| `/admissions/applications` | Compact FeeProgress; initials avatars; denser rows; row hover |
| `/admissions/applications/new` | 3-step wizard (bio → school/class → guardian) |
| `/admissions` | FeeProgress + proportional bars for stage/class |
| `/dashboard` | Live metrics (open apps, outstanding fees, year/term) + shortcuts; removed stale “later phases” copy |
| `/settings/classes`, `/subjects` | Read-only tables; one-row expand-to-edit |
| `/settings/academic` | Separated Set current year vs term |
| `/settings/fees`, `/school` | Surface hierarchy / layout balance; staff-facing fees copy |
| `/login`, `/reset-password`, `/accept-invite` | Shared AuthShell brand treatment |
| `/staff/invite`, `/admin`, marketing | Light consistency polish |

### Deliberately deferred

- Dark mode activation (tokens exist; not enabled).
- Chart library (CSS bars only).
- Migrating every remaining raw `<select>` to `Select` (touched pages prefer shared styles; not a full sweep).
- White reversed logo SVG; document delete/replace; inquiry-only intake.
- Phase 4+ modules (attendance, academics depth, parent portal, etc.).

---

## 2026-09-06 — Real email, password reset & staff invite lifecycle

Extends Phase 1 auth/mail scaffolding (does not replace Auth.js Credentials + JWT or the invite/`VerificationToken` model).

### Mailer (`src/lib/mail/`)

- Provider switch: `EMAIL_PROVIDER=smtp` + configured `SMTP_*` → **nodemailer SMTP**; otherwise **dev-log** (console) with no throw — CI / fresh checkouts keep working.
- Files: `index.ts`, `types.ts`, `providers/smtp.ts`, `providers/dev-log.ts`, `templates/` (shell + invite / password-reset / admissions-status builders).
- Shared branded HTML + plain-text shell (Excellence Kids blue `#0C6C9C`, logo PNG, single CTA, table layout / inline styles).
- Call sites: invite, password reset, admissions stage-change ([`notify.ts`](src/lib/admissions/notify.ts)) — one path only.

**Env var names** (values blank in [`.env.example`](.env.example); real credentials only in local `.env` / Vercel):

`EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`

### `mustChangePassword`

- Prisma field on `User`, default `false`. Migration: [`prisma/migrations/20260906193445_must_change_password`](prisma/migrations/20260906193445_must_change_password/migration.sql).
- Seeded admin upsert sets `mustChangePassword: true` (known default password).
- `/account/change-password` — current + new + confirm; clears flag on success. Sidebar account link in [`TenantShell`](src/components/layout/TenantShell.tsx).
- Authenticated layout re-reads DB: if flag set, only `/account/change-password` is reachable (nav hidden). Accept-invite leaves flag `false`.

### Staff lifecycle (`/staff`)

- Replaces invite-only form. Nav: Staff → `/staff`. Legacy `/staff/invite` redirects.
- List statuses: **Active**, **Invited (pending)**, **Invite expired**, plus inactive.
- Actions (all gated by `staff.invite`): invite, resend (invalidates old token), revoke pending (`deletedAt`), deactivate / reactivate (`INACTIVE` / `ACTIVE` — not hard delete).
- Invite TTL: **48 hours**. Accept-invite still single-use; invited users set their own password (`mustChangePassword` never applies).

### Password reset hardening

- Reset TTL: **1 hour** (was shared 48h). Anti-enumeration response unchanged.
- Throttle: in-memory ~60s cooldown per email/IP on reset-request and invite/resend ([`src/lib/auth/throttle.ts`](src/lib/auth/throttle.ts)). Per-process only — not shared across serverless instances.
- **Token hashing fixed now:** `VerificationToken.token` stores `sha256(raw)`; email/link carries raw hex. Contained to [`tokens.ts`](src/lib/auth/tokens.ts).
- Confirm-password + min length 8 on reset, accept-invite, and change-password forms.

### JWT / session limitations (documented, not fixed this pass)

- JWT sessions cannot be centrally revoked. Password change/reset does **not** invalidate other active session cookies until they expire.
- Deactivate sets `status: INACTIVE`. Login already blocks inactive users. **Also** `requireSession` + authenticated layout re-check DB status/`deletedAt` on each request so access fails closed on the next navigation/server action (not an instantaneous kill of an isolated JWT).

### Intentionally unfinished / deferred (carry-forward)

- Auth.js Prisma adapter / DB sessions (would enable true server-side session revoke).
- `STAFF_MANAGE` still unused — whole staff screen uses `staff.invite`.
- Multi-instance distributed rate limiting for SMS/email.
- Phase 4+ modules; platform admin; Postgres RLS.

---

## 2026-09-07 — Guardian SMS (ebits)

Adds Ghana SMS notifications via ebits (Arkesel-compatible), gated by `SchoolSettings.enableSmsNotifications`.

### SMS stack (`src/lib/sms/`)

- Provider switch: `SMS_PROVIDER=ebits` + `EBITS_SMS_*` → live send; otherwise **noop** (console log).
- Files: `send.ts`, `dispatch.ts` (never throws; writes `NotificationLog`), `phone.ts` (GH normalize), `templates.ts`, `providers/ebits.ts` + `noop.ts`.
- Env (placeholders in [`.env.example`](.env.example)): `SMS_PROVIDER`, `EBITS_SMS_BASE_URL`, `EBITS_SMS_API_KEY`, `EBITS_SMS_SENDER_ID`.

### Hooks

- Stage change, admission fee invoice generate, payment recorded → guardian SMS (+ existing email for stage).
- Staff **Send arrears reminder** on FeePanel; bulk remind on `/admissions`.
- `/communications` Compose SMS (all primary guardians or by class) → `Announcement` + batched SMS.
- Permission: `communications.send` (owners/admins + accountant).

### Schema

- Migration [`20260907163000_notification_log_sms_fields`](prisma/migrations/20260907163000_notification_log_sms_fields/migration.sql): `NotificationLog.schoolId`, `body`, `errorMessage`.

### Smoke checklist

1. Leave `SMS_PROVIDER=noop`, enable SMS in School settings → record payment / compose → check server logs + `NotificationLog`.
2. Set `SMS_PROVIDER=ebits` with approved sender ID → test Compose to a staff phone.
3. With SMS toggle off, no provider calls.
