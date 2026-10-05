import Link from "next/link";
import { PageHeader, Button } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra } from "@/lib/format/currency";
import { AcademicForms } from "./AcademicForms";
import { AcademicYearsList } from "./AcademicYearsList";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

      <div className="mb-8">
        <AcademicYearsList
          readOnly={!canManage}
          years={years.map((y) => ({
            id: y.id,
            name: y.name,
            startDate: toDateInputValue(y.startDate),
            endDate: toDateInputValue(y.endDate),
            isCurrent: y.isCurrent,
            startLabel: formatDateAccra(y.startDate),
            endLabel: formatDateAccra(y.endDate),
            terms: y.terms.map((t) => ({
              id: t.id,
              name: t.name,
              startDate: toDateInputValue(t.startDate),
              endDate: toDateInputValue(t.endDate),
              isCurrent: t.isCurrent,
              startLabel: formatDateAccra(t.startDate),
              endLabel: formatDateAccra(t.endDate),
            })),
          }))}
        />
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
