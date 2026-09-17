import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";

export default async function StudentsListPage() {
  const { tenant } = await requirePageAccess(ACTIONS.FEES_READ);

  const students = await prisma.student.findMany({
    where: { schoolId: tenant.schoolId, deletedAt: null, isActive: true },
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
        description="Enrolled students. Open fees to view and record school fee payments."
      />
      <ul className="mt-4 divide-y divide-[var(--gray-100)] rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--white)]">
        {students.length === 0 ? (
          <li className="px-4 py-6 text-[15px] text-[var(--gray-600)]">
            No enrolled students yet. Convert an admitted applicant to create one.
          </li>
        ) : (
          students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}/fees`}
                className="interactive-row flex items-center justify-between px-4 py-3"
              >
                <span className="font-medium text-[var(--gray-900)]">
                  {s.firstName} {s.lastName}
                </span>
                <span className="text-[14px] text-[var(--gray-600)]">
                  {s.admissionNumber}
                  {s.currentClassLevelId
                    ? ` · ${levelName.get(s.currentClassLevelId) ?? ""}`
                    : ""}
                  {" · Fees"}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
