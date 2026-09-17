import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumb } from "@/components/ui/Card";
import { ImportClient } from "./ImportClient";

export default async function AdmissionsImportPage() {
  await requirePageAccess(ACTIONS.ADMISSIONS_CREATE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Admissions", href: "/admissions" },
            { label: "Import existing students" },
          ]}
        />
        <PageHeader
          title="Import existing students"
          description="Upload an Excel sheet of existing students."
        />
      </div>
      <ImportClient />
    </div>
  );
}
