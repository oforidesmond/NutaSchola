import Link from "next/link";
import { PageHeader, Button, StatusBadge } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra } from "@/lib/format/currency";
import { AcademicForms } from "./AcademicForms";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function AcademicSettingsPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.ACADEMIC_READ);
  const canManage = can(user.role, ACTIONS.ACADEMIC_MANAGE);

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

      {!canManage ? (
        <ReadOnlyBanner message="Only school admins can change academic years and terms. You can view the calendar below." />
      ) : null}

      <div className="mb-8 flex flex-col gap-4">
        {years.map((year) => (
          <Card key={year.id}>
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
                  className="interactive-row flex min-h-11 flex-wrap items-center justify-between gap-2 py-2"
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
                <li className="py-4 text-[15px] text-[var(--gray-500)]">
                  No terms in this year yet.
                  {canManage ? " Add one below." : null}
                </li>
              ) : null}
            </ul>
          </Card>
        ))}
        {years.length === 0 ? (
          <Card variant="flat" className="text-center">
            <p className="text-base font-medium text-[var(--gray-800)]">
              No academic years yet
            </p>
            <p className="mt-1 text-[15px] text-[var(--gray-600)]">
              {canManage
                ? "Create a year below to start organizing terms for admissions and enrollment."
                : "Ask a school admin to set up academic years and terms."}
            </p>
          </Card>
        ) : null}
      </div>

      <AcademicForms
        readOnly={!canManage}
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
