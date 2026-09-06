import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { FeeProgress } from "@/components/ui/FeeProgress";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  ALL_FILTER_STAGES,
  admissionStageLabel,
  admissionStageTone,
} from "@/lib/admissions/stages";
import { formatGhs } from "@/lib/format/currency";
import { Decimal } from "@prisma/client/runtime/library";
import { ExportMenu } from "@/components/reports/ExportMenu";

export default async function AdmissionsDashboardPage() {
  const { tenant } = await requireAction(ACTIONS.ADMISSIONS_READ);

  const [stageGroups, classGroups, totalApplications, enrolledCount, feeInvoices] =
    await Promise.all([
      prisma.admissionApplication.groupBy({
        by: ["stage"],
        where: { schoolId: tenant.schoolId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.admissionApplication.groupBy({
        by: ["classLevelAppliedId"],
        where: { schoolId: tenant.schoolId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.admissionApplication.count({
        where: { schoolId: tenant.schoolId, deletedAt: null },
      }),
      prisma.admissionApplication.count({
        where: {
          schoolId: tenant.schoolId,
          deletedAt: null,
          convertedStudentId: { not: null },
        },
      }),
      prisma.invoice.findMany({
        where: {
          schoolId: tenant.schoolId,
          admissionApplication: { is: { deletedAt: null } },
        },
        select: { totalAmount: true, amountPaid: true },
      }),
    ]);

  const classLevelIds = classGroups.map((g) => g.classLevelAppliedId);
  const classLevels = classLevelIds.length
    ? await prisma.classLevel.findMany({
        where: { id: { in: classLevelIds } },
        select: { id: true, name: true, order: true },
      })
    : [];
  const classLevelById = new Map(classLevels.map((c) => [c.id, c]));

  const stageCountByStage = new Map(stageGroups.map((g) => [g.stage, g._count._all]));
  const conversionRate =
    totalApplications > 0 ? (enrolledCount / totalApplications) * 100 : 0;

  let feeInvoiced = new Decimal(0);
  let feePaid = new Decimal(0);
  for (const inv of feeInvoices) {
    feeInvoiced = feeInvoiced.plus(new Decimal(inv.totalAmount.toString()));
    feePaid = feePaid.plus(new Decimal(inv.amountPaid.toString()));
  }
  const feeOutstandingAmt = feeInvoiced.minus(feePaid);
  const maxStageCount = Math.max(
    1,
    ...ALL_FILTER_STAGES.map((s) => stageCountByStage.get(s) ?? 0),
  );

  const classRows = classGroups
    .map((g) => ({
      id: g.classLevelAppliedId,
      name: classLevelById.get(g.classLevelAppliedId)?.name ?? "Unknown class",
      order: classLevelById.get(g.classLevelAppliedId)?.order ?? 999,
      count: g._count._all,
    }))
    .sort((a, b) => a.order - b.order);
  const maxClassCount = Math.max(1, ...classRows.map((r) => r.count), 1);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admissions"
        description="Pipeline health across every stage, class applied for, and conversion into enrolled students."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              links={[
                {
                  label: "Export CSV",
                  href: "/api/reports/admissions/dashboard",
                },
              ]}
            />
            <Link
              href="/admissions/applications/new"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-600)] px-4 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-700)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New application
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total applications" value={String(totalApplications)} />
        <SummaryCard label="Enrolled" value={String(enrolledCount)} />
        <SummaryCard label="Inquiry → enrolled" value={`${conversionRate.toFixed(1)}%`} />
      </div>

      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Admission fees</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          School-wide admission fee totals — partial payment is a normal state.
        </p>
        <div className="mt-5 max-w-md">
          <FeeProgress
            amounts={{
              totalAmount: feeInvoiced.toFixed(2),
              amountPaid: feePaid.toFixed(2),
            }}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Invoiced" value={formatGhs(feeInvoiced.toFixed(2))} />
          <MiniStat label="Paid" value={formatGhs(feePaid.toFixed(2))} />
          <MiniStat label="Outstanding" value={formatGhs(feeOutstandingAmt.toFixed(2))} />
        </div>
      </section>

      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">By stage</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {ALL_FILTER_STAGES.map((stage) => {
            const count = stageCountByStage.get(stage) ?? 0;
            const pct = Math.round((count / maxStageCount) * 100);
            return (
              <li key={stage} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-[11rem] items-center justify-between gap-2 sm:justify-start">
                  <StatusBadge
                    label={admissionStageLabel(stage)}
                    tone={admissionStageTone(stage)}
                  />
                  <span className="font-variant-numeric tabular-nums text-[15px] font-semibold text-[var(--gray-900)] sm:hidden">
                    {count}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gray-100)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="hidden w-8 shrink-0 text-right font-variant-numeric tabular-nums text-[15px] font-semibold text-[var(--gray-900)] sm:inline">
                    {count}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface-raised p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">By class applied for</h2>
          <Link
            href="/admissions/applications"
            className="focus-ring inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-2 text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
          >
            View all applications
          </Link>
        </div>
        {classRows.length === 0 ? (
          <p className="mt-3 text-[15px] text-[var(--gray-600)]">No applications yet.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {classRows.map((row) => {
              const pct = Math.round((row.count / maxClassCount) * 100);
              return (
                <li key={row.id} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-[15px] font-medium text-[var(--gray-900)] sm:w-36">
                    {row.name}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--gray-100)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-400)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-variant-numeric tabular-nums text-[15px] font-semibold text-[var(--gray-900)]">
                    {row.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="surface-raised p-5">
      <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
        {label}
      </p>
      <p className="mt-2 font-variant-numeric tabular-nums text-[28px] font-semibold text-[var(--gray-900)]">
        {value}
      </p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--gray-50)] px-3 py-2">
      <p className="text-[12px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
        {label}
      </p>
      <p className="mt-0.5 font-variant-numeric tabular-nums text-[15px] font-semibold text-[var(--gray-900)]">
        {value}
      </p>
    </div>
  );
}
