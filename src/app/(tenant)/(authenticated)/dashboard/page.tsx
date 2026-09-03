import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra } from "@/lib/format/currency";

export default async function DashboardPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId: tenant.schoolId, isCurrent: true },
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Foundations are in place. Admissions and academic structure arrive in later phases."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
            School
          </p>
          <h2 className="mt-2 text-[20px] font-semibold text-[var(--gray-900)]">
            {tenant.school.name}
          </h2>
          <p className="mt-1 text-[15px] text-[var(--gray-600)]">
            {tenant.school.city ?? "Ghana"} · {tenant.school.currency}
          </p>
          <div className="mt-4">
            <StatusBadge label="Active" tone="success" />
          </div>
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
            Current academic year
          </p>
          <h2 className="mt-2 text-[20px] font-semibold text-[var(--gray-900)]">
            {currentYear?.name ?? "Not set"}
          </h2>
          {currentYear ? (
            <p className="mt-1 text-[15px] text-[var(--gray-600)]">
              {formatDateAccra(currentYear.startDate)} –{" "}
              {formatDateAccra(currentYear.endDate)}
            </p>
          ) : (
            <p className="mt-1 text-[15px] text-[var(--gray-600)]">
              Academic year management arrives in Phase 2.
            </p>
          )}
          <Link
            href="/settings/school"
            className="mt-4 inline-flex min-h-11 items-center text-[15px] font-semibold text-[var(--brand-700)]"
          >
            Open school settings
          </Link>
        </section>
      </div>
    </div>
  );
}
