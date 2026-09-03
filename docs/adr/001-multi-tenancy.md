# ADR 001 — Multi-tenancy model

**Status:** Accepted  
**Date:** 2026-09-03  
**Context:** NutaSchola / Excellence Kids — Phase 0 foundations

## Decision

Use a **shared Postgres database**, **shared schema**, and a **`schoolId` discriminator** on every tenant-scoped table.

Tenant isolation is enforced in the **application layer** today (every server-side data path goes through `requireTenant()` / session `schoolId`). Postgres Row-Level Security is deferred to roadmap Phase 8 as defense-in-depth once multi-tenant traffic justifies it.

## Why this shape

1. **Fits Neon + Vercel serverless.** One database, connection pooling (PgBouncer / Neon pooled URL), and no per-tenant schema migrations. Prisma and Neon branch previews stay simple.
2. **Matches the already-designed schema.** `School` is the tenant root; nearly every domain model already carries `schoolId`. Redesigning around DB-per-tenant would throw away that foundation.
3. **Operational simplicity for a Ghanaian first client.** Excellence Kids ships single-tenant first, but SaaS expansion (Phase 7) should be onboarding new `School` rows — not provisioning new databases.
4. **Auth clarity.** Staff users belong to one school (`User.schoolId`). Platform `SUPER_ADMIN` may have `schoolId = null` and uses the `(platform)` route group.

## Alternatives considered

| Approach | Why not now |
|---|---|
| Database-per-tenant | High ops cost on Neon; painful migrations; poor fit for serverless pooling |
| Schema-per-tenant | Awkward with Prisma; migration fan-out; still one Postgres instance to manage carefully |
| Path-prefix tenancy (`/s/{slug}/…`) as source of truth | Easy to forget in APIs; we keep paths simple and put tenancy in the **session claim**, with a subdomain helper stubbed for later |

## Consequences

- **Must:** filter by `schoolId` on every tenant query; never trust a client-supplied school id without matching the session tenant.
- **Must:** add `schoolId` (or a clear parent that inherits scope) to every new tenant table.
- **Must not:** “fix” isolation by dropping `schoolId` filters for convenience.
- **Later:** enable RLS keyed on `schoolId` (Phase 8); resolve tenant from subdomain using `School.slug` when DNS is ready.

## Related code

- `src/lib/tenancy/index.ts` — `requireTenant()`, `assertSameTenant()`, subdomain stub
- `src/lib/auth/session.ts` — session → tenant binding
- `prisma/schema.prisma` — `School` and `schoolId` columns
