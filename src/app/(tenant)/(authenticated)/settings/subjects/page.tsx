import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { SubjectsManager } from "./SubjectsManager";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function SubjectsSettingsPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.ACADEMIC_READ);
  const canManage = can(user.role, ACTIONS.ACADEMIC_MANAGE);

  const subjects = await prisma.subject.findMany({
    where: { schoolId: tenant.schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="All subjects and their codes."
        action={
          <ExportMenu
            links={[{ label: "Export CSV", href: "/api/reports/settings/subjects" }]}
          />
        }
      />
      {!canManage ? (
        <ReadOnlyBanner message="Only school admins can change subjects. You can view the list below." />
      ) : null}
      <SubjectsManager
        readOnly={!canManage}
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }))}
      />
    </div>
  );
}
