import { PageHeader } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { SchoolSettingsForm } from "./SchoolSettingsForm";

export default async function SchoolSettingsPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

  const [settings, currentYear] = await Promise.all([
    prisma.schoolSettings.findUniqueOrThrow({
      where: { schoolId: tenant.schoolId },
    }),
    prisma.academicYear.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="School settings"
        description="Name, address, admission numbering, and notification defaults for this school."
      />
      <SchoolSettingsForm
        school={tenant.school}
        settings={settings}
        currentAcademicYearName={currentYear?.name ?? null}
      />
    </div>
  );
}
