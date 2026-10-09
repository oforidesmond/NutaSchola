import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { BulkGenerateInvoicesButton } from "./BulkGenerateInvoicesButton";

export default async function StudentsListPage({
  searchParams,
}: {
  searchParams: Promise<{ showInactive?: string }>;
}) {
  const { user, tenant } = await requirePageAccess(ACTIONS.FEES_READ);
  const canManageFees = can(user.role, ACTIONS.FEES_MANAGE);
  const { showInactive } = await searchParams;
  const includeInactive = showInactive === "1";

  const students = await prisma.student.findMany({
    where: {
      schoolId: tenant.schoolId,
      ...(includeInactive
        ? {}
        : { deletedAt: null, isActive: true }),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  const levels = await prisma.classLevel.findMany({
    where: { schoolId: tenant.schoolId },
    select: { id: true, name: true },
  });
  const levelName = new Map(levels.map((l) => [l.id, l.name]));

  return (
    <div>
      <PageHeader
        title="Students"
        description="Enrolled students. Open a student to edit their profile or record school fee payments."
        action={
          <Link
            href={includeInactive ? "/students" : "/students?showInactive=1"}
            className="text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
          >
            {includeInactive ? "Hide inactive" : "Show inactive"}
          </Link>
        }
      />
      {canManageFees ? (
        <div className="mt-4">
          <BulkGenerateInvoicesButton />
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-[var(--gray-100)] rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--white)]">
        {students.length === 0 ? (
          <li className="px-4 py-6 text-[15px] text-[var(--gray-600)]">
            {includeInactive
              ? "No students found."
              : "No enrolled students yet. Convert an admitted applicant to create one."}
          </li>
        ) : (
          students.map((s) => {
            const inactive = !s.isActive || Boolean(s.deletedAt);
            return (
              <li key={s.id}>
                <div className="interactive-row flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <Link
                    href={`/students/${s.id}${inactive ? "?showInactive=1" : ""}`}
                    className="min-w-0 flex-1"
                  >
                    <span className="flex flex-wrap items-center gap-2 font-medium text-[var(--gray-900)]">
                      {s.lastName}, {s.firstName}
                      {inactive ? <StatusBadge label="Inactive" tone="warning" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[var(--gray-500)]">
                      {s.admissionNumber}
                      {s.currentClassLevelId
                        ? ` · ${levelName.get(s.currentClassLevelId) ?? "—"}`
                        : ""}
                    </span>
                  </Link>
                  <Link
                    href={`/students/${s.id}/fees`}
                    className="shrink-0 text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
                  >
                    Fees
                  </Link>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
