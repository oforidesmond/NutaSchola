import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
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
  const feeOutstanding = feeInvoiced.minus(feePaid);

  const classRows = classGroups
    .map((g) => ({
      id: g.classLevelAppliedId,
      name: classLevelById.get(g.classLevelAppliedId)?.name ?? "Unknown class",
      order: classLevelById.get(g.classLevelAppliedId)?.order ?? 999,
      count: g._count._all,
    }))
    .sort((a, b) => a.order - b.order);

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
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-600)] px-4 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-700)]"
            >
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

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Admission fees</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Separate from stage counts — partial payment is a normal state.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Invoiced" value={formatGhs(feeInvoiced.toFixed(2))} />
          <SummaryCard label="Paid" value={formatGhs(feePaid.toFixed(2))} />
          <SummaryCard label="Outstanding" value={formatGhs(feeOutstanding.toFixed(2))} />
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">By stage</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_FILTER_STAGES.map((stage) => (
            <div
              key={stage}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--gray-100)] px-4 py-3"
            >
              <StatusBadge label={admissionStageLabel(stage)} tone={admissionStageTone(stage)} />
              <span className="font-variant-numeric tabular-nums text-[20px] font-semibold text-[var(--gray-900)]">
                {stageCountByStage.get(stage) ?? 0}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">By class applied for</h2>
          <Link
            href="/admissions/applications"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
          >
            View all applications
          </Link>
        </div>
        {classRows.length === 0 ? (
          <p className="mt-3 text-[15px] text-[var(--gray-600)]">No applications yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[15px]">
              <thead className="border-b border-[var(--gray-200)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Class</th>
                  <th className="px-4 py-2 font-semibold">Applications</th>
                </tr>
              </thead>
              <tbody>
                {classRows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--gray-100)]">
                    <td className="px-4 py-2 font-medium text-[var(--gray-900)]">{row.name}</td>
                    <td className="px-4 py-2 font-variant-numeric tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
        {label}
      </p>
      <p className="mt-2 font-variant-numeric tabular-nums text-[28px] font-semibold text-[var(--gray-900)]">
        {value}
      </p>
    </section>
  );
}
