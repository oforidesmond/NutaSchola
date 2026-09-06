import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { SchoolSettingsForm } from "./SchoolSettingsForm";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function SchoolSettingsPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.SCHOOL_SETTINGS_READ);
  const canManage = can(user.role, ACTIONS.SCHOOL_SETTINGS_UPDATE);

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
      {!canManage ? (
        <ReadOnlyBanner message="Only school admins and IT support can change school profile settings. You can view the current details below." />
      ) : null}
      <SchoolSettingsForm
        school={tenant.school}
        settings={settings}
        currentAcademicYearName={currentYear?.name ?? null}
        readOnly={!canManage}
      />
    </div>
  );
}
