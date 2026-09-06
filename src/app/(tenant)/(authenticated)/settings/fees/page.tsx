import Link from "next/link";
import { PageHeader, Button } from "@/components/ui/primitives";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatGhs } from "@/lib/format/currency";
import { AdmissionFeeForm } from "./AdmissionFeeForm";

export default async function FeesSettingsPage() {
  const { tenant } = await requireAction(ACTIONS.SCHOOL_SETTINGS_READ);

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

      {!feeStructure || !primaryItem ? (
        <p className="mt-4 text-[15px] text-[var(--gray-600)]">
          No admission fee structure is configured. Run the database seed or create an admission{" "}
          <code className="text-[13px]">FeeStructure</code> with{" "}
          <code className="text-[13px]">isAdmissionFee</code> for this school.
        </p>
      ) : (
        <div className="mt-2">
          <p className="text-[15px] text-[var(--gray-700)]">
            Structure: <span className="font-medium text-[var(--gray-900)]">{feeStructure.name}</span>
            {" · "}
            Current amount:{" "}
            <span className="font-variant-numeric tabular-nums font-semibold">
              {formatGhs(primaryItem.amount.toString())}
            </span>
          </p>
          <AdmissionFeeForm
            feeItemId={primaryItem.id}
            itemName={primaryItem.name}
            amount={primaryItem.amount.toFixed(2)}
          />
        </div>
      )}
    </div>
  );
}
