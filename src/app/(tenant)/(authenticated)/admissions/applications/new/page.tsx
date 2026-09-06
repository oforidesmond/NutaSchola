import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { NewApplicationForm } from "./NewApplicationForm";

export default async function NewApplicationPage() {
  const { tenant } = await requirePageAccess(ACTIONS.ADMISSIONS_CREATE);

  const [classLevels, academicYears] = await Promise.all([
    prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.academicYear.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isCurrent: true },
    }),
  ]);

  const currentAcademicYearId = academicYears.find((y) => y.isCurrent)?.id ?? "";

  return (
    <div>
      <PageHeader
        title="New application"
        description="Capture applicant bio-data, previous school, class applying for, and at least one guardian."
      />
      <NewApplicationForm
        classLevels={classLevels}
        academicYears={academicYears}
        defaultAcademicYearId={currentAcademicYearId}
      />
    </div>
  );
}
