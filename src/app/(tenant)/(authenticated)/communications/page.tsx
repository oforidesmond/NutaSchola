import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { ComposeSmsForm } from "./ComposeSmsForm";

export default async function CommunicationsPage() {
  const { tenant } = await requirePageAccess(ACTIONS.COMMUNICATIONS_SEND);

  const [classLevels, settings] = await Promise.all([
    prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.schoolSettings.findUnique({
      where: { schoolId: tenant.schoolId },
      select: { enableSmsNotifications: true },
    }),
  ]);

  const smsEnabled = settings?.enableSmsNotifications ?? false;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Communications"
        description="Compose an SMS to guardians about school notices and current issues."
      />

      {!smsEnabled ? (
        <p className="max-w-xl rounded-[var(--radius-sm)] bg-[var(--warning-50)] px-3 py-2 text-[15px] text-[var(--warning-700)]">
          SMS notifications are currently off. Turn on “Enable SMS notifications” under School
          settings before sending.
        </p>
      ) : null}

      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Compose SMS</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Messages go to primary guardian phones. The school name is prepended automatically.
        </p>
        <div className="mt-5">
          <ComposeSmsForm classLevels={classLevels} />
        </div>
      </section>
    </div>
  );
}
