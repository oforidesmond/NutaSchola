import Link from "next/link";
import { PageHeader, Button } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatGhs } from "@/lib/format/currency";
import { AdmissionFeeForm } from "./AdmissionFeeForm";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function FeesSettingsPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.FEES_READ);
  const canManage = can(user.role, ACTIONS.FEES_MANAGE);

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { schoolId: tenant.schoolId, isAdmissionFee: true },
    include: { items: { orderBy: { name: "asc" } } },
  });

  const primaryItem = feeStructure?.items[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Configure the admission fee used when generating new applicant invoices. Existing invoices keep their historical amounts."
        action={
          <Link href="/settings/school">
            <Button variant="secondary" type="button">
              School settings
            </Button>
          </Link>
        }
      />

      {!canManage ? (
        <ReadOnlyBanner message="Only school admins and accountants can change fee amounts. You can view the current admission fee below." />
      ) : null}

      {!feeStructure || !primaryItem ? (
        <Card variant="flat" className="mt-4 max-w-3xl">
          <p className="text-base font-medium text-[var(--gray-800)]">
            Admission fee not set up yet
          </p>
          <p className="mt-2 text-[15px] text-[var(--gray-600)]">
            This school does not have an admission fee configured. Ask your platform
            administrator to finish school setup, or re-run the school seed so the
            default admission fee is created.
          </p>
        </Card>
      ) : (
        <Card className="mt-2 max-w-3xl">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
                Admission fee
              </h2>
              <p className="mt-1 text-[15px] text-[var(--gray-600)]">
                {feeStructure.name}
              </p>
            </div>
            <p className="font-variant-numeric text-[22px] font-semibold tabular-nums text-[var(--gray-900)]">
              {formatGhs(primaryItem.amount.toString())}
            </p>
          </div>
          <AdmissionFeeForm
            feeItemId={primaryItem.id}
            itemName={primaryItem.name}
            amount={primaryItem.amount.toFixed(2)}
            readOnly={!canManage}
          />
        </Card>
      )}
    </div>
  );
}
