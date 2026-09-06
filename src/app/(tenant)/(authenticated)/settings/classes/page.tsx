import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { ClassesManager } from "./ClassesManager";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function ClassesSettingsPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.ACADEMIC_READ);
  const canManage = can(user.role, ACTIONS.ACADEMIC_MANAGE);

  const levels = await prisma.classLevel.findMany({
    where: { schoolId: tenant.schoolId },
    include: { sections: { orderBy: { name: "asc" } } },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Classes & sections"
        description="All classes and sections for this school."
        action={
          <ExportMenu
            links={[{ label: "Export CSV", href: "/api/reports/settings/classes" }]}
          />
        }
      />
      {!canManage ? (
        <ReadOnlyBanner message="Only school admins can change classes and sections. You can view the structure below." />
      ) : null}
      <ClassesManager
        readOnly={!canManage}
        levels={levels.map((l) => ({
          id: l.id,
          name: l.name,
          levelType: l.levelType,
          order: l.order,
          capacity: l.capacity,
          sections: l.sections.map((s) => ({ id: s.id, name: s.name })),
        }))}
      />
    </div>
  );
}
