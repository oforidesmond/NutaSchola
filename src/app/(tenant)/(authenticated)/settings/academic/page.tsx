import Link from "next/link";
import { PageHeader, Button, StatusBadge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra } from "@/lib/format/currency";
import { AcademicForms } from "./AcademicForms";
import { ExportMenu } from "@/components/reports/ExportMenu";

export default async function AcademicSettingsPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

  const years = await prisma.academicYear.findMany({
    where: { schoolId: tenant.schoolId },
    include: { terms: { orderBy: { startDate: "asc" } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Academic years & terms"
        description="Create years and terms, and mark which ones are current for admissions and enrollment."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              links={[{ label: "Export CSV", href: "/api/reports/settings/academic" }]}
            />
            <Link href="/settings/school">
              <Button variant="secondary" type="button">
                School settings
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-8 flex flex-col gap-4">
        {years.map((year) => (
          <section
            key={year.id}
            className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
                  {year.name}
                </h2>
                <p className="mt-1 text-[15px] text-[var(--gray-600)]">
                  {formatDateAccra(year.startDate)} – {formatDateAccra(year.endDate)}
                </p>
              </div>
              {year.isCurrent ? (
                <StatusBadge label="Current year" tone="success" />
              ) : null}
            </div>
            <ul className="mt-4 divide-y divide-[var(--gray-100)]">
              {year.terms.map((term) => (
                <li
                  key={term.id}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div>
                    <p className="text-[15px] font-medium text-[var(--gray-800)]">
                      {term.name}
                      {term.isCurrent ? (
                        <span className="ml-2">
                          <StatusBadge label="Current term" tone="info" />
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-[var(--gray-500)]">
                      {formatDateAccra(term.startDate)} – {formatDateAccra(term.endDate)}
                    </p>
                  </div>
                </li>
              ))}
              {year.terms.length === 0 ? (
                <li className="py-3 text-[15px] text-[var(--gray-500)]">No terms yet.</li>
              ) : null}
            </ul>
          </section>
        ))}
        {years.length === 0 ? (
          <p className="text-base text-[var(--gray-600)]">No academic years yet. Create one below.</p>
        ) : null}
      </div>

      <AcademicForms
        years={years.map((y) => ({
          id: y.id,
          name: y.name,
          isCurrent: y.isCurrent,
          terms: y.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent })),
        }))}
      />
    </div>
  );
}
