# SchoolSuite — Build Roadmap

A step-by-step plan for designing and building the platform, in order of what needs to be *achieved*, not when. Admissions is the client's immediate deliverable; everything after Phase 5 is foundation you're laying now so it doesn't have to be re-architected later.

---

## Phase 0 — Architecture & Environment Foundations
- [ ] Decide and document the multi-tenancy model: shared Postgres database, shared schema, every tenant-scoped table carries `schoolId`. Write this down as an ADR (architecture decision record) so future contributors don't "fix" it into something else.
- [ ] Set up the Next.js (App Router) project structure: route groups for public marketing site, tenant app, and (later) platform admin.
- [ ] Set up Prisma with Neon for local Docker Postgres in dev and Neon Postgres in prod. Confirm `DATABASE_URL` and a separate `DIRECT_URL` for migrations (Neon requires a non-pooled connection for `prisma migrate`).
- [ ] Set up Vercel Blob and confirm upload/read flow works end-to-end from a Next.js Server Action or Route Handler.
- [ ] Decide on the auth approach (Auth.js/NextAuth vs. a custom session system) and how tenant context is resolved on each request (subdomain, path prefix, or session claim).
- [ ] Set up environments: local (Docker), preview (Vercel preview + Neon branch), production (Vercel + Neon main).
- [ ] Set up CI: lint, typecheck, `prisma validate`, and a migration dry-run on every PR.
- [ ] Establish conventions: folder structure, error handling, API/Server Action response shape, logging.

## Phase 1 — Core Tenancy & Identity
- [ ] Implement the `School` (tenant) model and a school onboarding flow (even if just seeded manually for the first client).
- [ ] Implement `User`, roles, and a permission-checking utility (role → allowed actions).
- [ ] Build a tenant-resolution middleware/helper that every server-side data call goes through, so `schoolId` scoping is impossible to forget.
- [ ] Build staff auth: login, invite-by-email, password reset.
- [ ] Build a minimal `SchoolSettings` screen (school name, address, admission number prefix, current academic year).

## Phase 2 — Academic Structure Setup
- [ ] Build `AcademicYear` and `Term` management (create year, set current year/term).
- [ ] Build `ClassLevel` and `Section` management, pre-populated with Ghana basic-school levels (Creche, Nursery, KG1–KG2, Primary 1–6, JHS 1–3) as a seed script the client can adjust.
- [ ] Build `Subject` management (data entry only for now — not wired into a full academics module yet).
- [ ] Write a seed script so every new school starts with a sensible default class structure instead of an empty state.

## Phase 3 — Admissions Module (Primary Deliverable)
- [ ] Design the application intake form to match what the client's staff already expect (bio-data, address, contact, previous school, class applying for — mirroring the fields visible in their current legacy search screen).
- [ ] Build guardian capture: create or link a `Guardian`, support multiple guardians per applicant, mark a primary contact.
- [ ] Build document upload (birth certificate, passport photo, previous report card) via Vercel Blob, linked through `Document`.
- [ ] Build the admission stage workflow (`AdmissionStage` enum) with a status-history/audit trail (`AdmissionStatusHistory`) so every stage change is traceable.
- [ ] Build the admissions list/search view: filter by name, class applying for, status, admission date, source — this is the direct equivalent of the client's existing search screen, done properly.
- [ ] Build admission fee invoicing: generate an `Invoice` off an "Admission Fee" `FeeStructure`, record a `Payment` against it (cash first; gateway integration can follow).
- [ ] Build the "convert applicant to student" action: on admit + fee paid (or admit-only, per the client's process), create the `Student` record, `Enrollment` for the current year, and link `convertedStudentId` back to the application.
- [ ] Build a basic admissions dashboard: counts by stage, by class, conversion rate from inquiry to enrolled.
- [x] Build status-change notifications (start with in-app or email; SMS can be a fast-follow once a Ghanaian SMS gateway is chosen).

## Phase 4 — Student Records (post-admission)
- [ ] Build the student profile view: bio-data, linked guardians, enrollment history.
- [ ] Build enrollment management: assign/reassign class and section for the current academic year.
- [ ] Build a read-only guardian view of their child's admission/enrollment status (foundation for a future parent portal — doesn't need to be a full portal yet).

## Phase 5 — Testing, QA & Launch (Admissions)
- [ ] Write integration tests for the full admission workflow: inquiry → documents → decision → conversion.
- [ ] Run UAT with the client using real applicant data (or a realistic dry run) before their admission season opens.
- [ ] Add duplicate-application detection (same child, same guardian phone/name within a window).
- [ ] Review indexes against the actual list/search queries the admissions screen uses; check query plans on Neon.
- [ ] Run a tenant-isolation check: confirm no query anywhere can return data across `schoolId` boundaries even if a client-supplied ID is manipulated.
- [ ] Deploy to Vercel production, point at the Neon production branch, run `prisma migrate deploy`.
- [ ] Produce a short handover doc / walkthrough for the client's admissions staff.

## Phase 6 — Foundation Modules Become Real Features
*(The schema already supports these; this phase is building the UI and business logic on top of it.)*
- [ ] **Fees & Payments:** general fee structures beyond admissions, invoicing UI, a Ghanaian payment gateway integration (Paystack and/or Hubtel for mobile money), receipts.
- [ ] **Attendance:** daily attendance marking UI for teachers, absence reports, guardian notification on absence.
- [ ] **Academics:** exam creation, result entry per subject, grade computation, printable report cards.
- [ ] **Communications:** announcements by audience (all/staff/class), SMS/email broadcast, individual guardian messaging. *(SMS compose to guardians + transactional SMS shipped 2026-09-07; email broadcast / staff audience / individual messaging still open.)*
- [ ] **Parent Portal:** dedicated guardian login (activate the `Guardian.userId` link), view child's attendance/fees/results.
- [ ] **Staff Management:** fuller HR fields, leave tracking, and a payroll foundation if the client needs it.
- [ ] **Reporting & Analytics:** cross-module dashboards (enrollment trends, fee collection rate, attendance trends).

## Phase 7 — SaaS Productization (multi-school expansion)
- [ ] Build subscription plans and billing (Stripe or a Ghana-friendly processor for recurring charges).
- [ ] Build self-serve school onboarding: sign up → create `School` → pick a plan → seed default academic structure.
- [ ] Build a platform super-admin panel to manage all tenant schools, subscriptions, and support requests.
- [ ] Enforce plan limits (`maxStudents`, `maxStaff`) at the point of creation, with clear upgrade prompts.
- [ ] Add tenant branding (logo, color accents) so each school's instance feels like their own product.
- [ ] Revisit `Guardian` as a school-scoped identity — decide if/when a guardian with children at multiple schools needs a single cross-tenant login.

## Phase 8 — Hardening & Scale
- [ ] Add Postgres Row-Level Security policies keyed on `schoolId` as defense-in-depth behind the application-layer scoping.
- [ ] Add caching (Vercel KV/Redis) for expensive dashboard queries.
- [ ] Extend `AuditLog` coverage to every state-changing action across all modules, not just admissions.
- [ ] Confirm Neon's automated backup/point-in-time-recovery settings and document a restore procedure.
- [ ] Load-test the admissions and dashboard queries before onboarding schools beyond the first client.

---

### Notes for future-you
- Every new table should get a `schoolId` (or clearly inherit tenant scope through a direct parent) — this is the single rule that keeps multi-tenancy sane as the schema grows.
- Money is always `Decimal`, never `Float`.
- If you adopt Auth.js/NextAuth, its Prisma adapter expects `Account`, `Session`, and `VerificationToken` models — add them pointed at the existing `User` model rather than creating a parallel identity table.
- `Document.entityType` + `entityId` is a soft polymorphic link (no DB-level foreign key, since Prisma doesn't support true polymorphism) — validate the pairing in your service layer, not just the UI.
