import { PageHeader } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { ClassesManager } from "./ClassesManager";
import { ExportMenu } from "@/components/reports/ExportMenu";

export default async function ClassesSettingsPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

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
      <ClassesManager
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
