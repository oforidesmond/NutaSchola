import { brand } from "@/config/brand";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import type { School } from "@prisma/client";

export type TenantContext = {
  schoolId: string;
  school: School;
  slug: string;
};

/**
 * Stub for future subdomain routing (e.g. excellence-kids.schoolsuite.app).
 * Phase 0–1 resolves tenant from the session claim instead.
 */
export function resolveSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }

  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  const slug = parts[0];
  if (!slug || slug === "www" || slug === "app") return null;
  return slug;
}

export function getDefaultSchoolSlug(): string {
  return process.env.DEFAULT_SCHOOL_SLUG ?? brand.defaultSchoolSlug;
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  return prisma.school.findFirst({
    where: { slug, deletedAt: null, isActive: true },
  });
}

/**
 * Every tenant-scoped server-side data call should go through this helper
 * (or a wrapper that calls it) so schoolId scoping is never optional.
 */
export async function requireTenant(schoolId: string | null | undefined): Promise<TenantContext> {
  if (!schoolId) {
    throw new AppError("TENANT_REQUIRED", "No school context on this session.", {
      status: 403,
    });
  }

  const school = await prisma.school.findFirst({
    where: { id: schoolId, deletedAt: null, isActive: true },
  });

  if (!school) {
    throw new AppError("TENANT_NOT_FOUND", "School not found or inactive.", {
      status: 404,
    });
  }

  return { schoolId: school.id, school, slug: school.slug };
}

/** Ensures a record's schoolId matches the active tenant. */
export function assertSameTenant(
  recordSchoolId: string | null | undefined,
  tenantSchoolId: string,
): void {
  if (recordSchoolId !== tenantSchoolId) {
    throw new AppError("TENANT_MISMATCH", "Resource does not belong to this school.", {
      status: 403,
    });
  }
}
