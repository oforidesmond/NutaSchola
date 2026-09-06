import { PageHeader } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { SubjectsManager } from "./SubjectsManager";
import { ExportMenu } from "@/components/reports/ExportMenu";

export default async function SubjectsSettingsPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

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
      <SubjectsManager
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }))}
      />
    </div>
  );
}
