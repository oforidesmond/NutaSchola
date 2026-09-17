import Link from "next/link";
import { PageHeader, Button } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatGhs } from "@/lib/format/currency";
import { AdmissionFeeForm } from "./AdmissionFeeForm";
import { SchoolFeesTable, type SchoolFeeRow } from "./SchoolFeesTable";
import { ReadOnlyBanner } from "@/components/ui/ReadOnlyBanner";

export default async function FeesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string }>;
}) {
  const { user, tenant } = await requirePageAccess(ACTIONS.FEES_READ);
  const canManage = can(user.role, ACTIONS.FEES_MANAGE);
  const params = await searchParams;

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { schoolId: tenant.schoolId, feeType: "ADMISSION" },
    include: { items: { orderBy: { name: "asc" } } },
  });

  const primaryItem = feeStructure?.items[0] ?? null;

  const terms = await prisma.term.findMany({
    where: { schoolId: tenant.schoolId },
    orderBy: [{ academicYear: { startDate: "desc" } }, { startDate: "asc" }],
    include: { academicYear: { select: { name: true } } },
  });
  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0] ?? null;
  const selectedTermId = params.termId ?? currentTerm?.id ?? null;
  const selectedTerm = terms.find((t) => t.id === selectedTermId) ?? currentTerm;

  const classLevels = await prisma.classLevel.findMany({
    where: { schoolId: tenant.schoolId },
    orderBy: { order: "asc" },
  });

  const schoolFeeStructures = selectedTerm
    ? await prisma.feeStructure.findMany({
        where: {
          schoolId: tenant.schoolId,
          feeType: "SCHOOL_FEES",
          termId: selectedTerm.id,
        },
        include: { items: { orderBy: { name: "asc" } } },
      })
    : [];

  const schoolFeeRows: SchoolFeeRow[] = [
    {
      classLevelId: null,
      classLevelName: "All levels (default)",
      feeStructureId: null,
      feeItemId: null,
      itemName: "Tuition",
      amount: "500.00",
    },
    ...classLevels.map((level) => ({
      classLevelId: level.id,
      classLevelName: level.name,
      feeStructureId: null as string | null,
      feeItemId: null as string | null,
      itemName: "Tuition",
      amount: "500.00",
    })),
  ];

  for (const row of schoolFeeRows) {
    const match = schoolFeeStructures.find(
      (s) => (s.classLevelId ?? null) === row.classLevelId,
    );
    const item = match?.items[0];
    if (match && item) {
      row.feeStructureId = match.id;
      row.feeItemId = item.id;
      row.itemName = item.name;
      row.amount = item.amount.toFixed(2);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Configure admission and school fees. New invoices snapshot amounts at generation time."
        action={
          <Link href="/settings/school">
            <Button variant="secondary" type="button">
              School settings
            </Button>
          </Link>
        }
      />

      {!canManage ? (
        <ReadOnlyBanner message="Only school admins and accountants can change fee amounts." />
      ) : null}

      {!feeStructure || !primaryItem ? (
        <Card variant="flat" className="mt-4 max-w-3xl">
          <p className="text-base font-medium text-[var(--gray-800)]">
            Admission fee not set up yet
          </p>
          <p className="mt-2 text-[15px] text-[var(--gray-600)]">
            Re-run the school seed so the default admission fee is created.
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

      <Card className="mt-8">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">School fees</h2>
          <p className="mt-1 text-[15px] text-[var(--gray-600)]">
            Per term and class level. A class-level row overrides the &quot;All levels&quot; default.
          </p>
        </div>
        {terms.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {terms.map((t) => (
              <Link
                key={t.id}
                href={`/settings/fees?termId=${t.id}`}
                className={`rounded-[var(--radius-sm)] px-3 py-2 text-[14px] font-medium ${
                  selectedTerm?.id === t.id
                    ? "bg-[var(--brand-50)] text-[var(--brand-800)]"
                    : "bg-[var(--gray-50)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                }`}
              >
                {t.academicYear.name} · {t.name}
                {t.isCurrent ? " · current" : ""}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-[var(--gray-600)]">
            No terms configured yet. Set up academic years and terms first.
          </p>
        )}

        {selectedTerm ? (
          <SchoolFeesTable
            termId={selectedTerm.id}
            rows={schoolFeeRows}
            readOnly={!canManage}
          />
        ) : null}
      </Card>
    </div>
  );
}
