import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Plus,
  CalendarRange,
  Layers,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import { Decimal } from "@prisma/client/runtime/library";

export default async function DashboardPage() {
  const session = await auth();
  const tenant = await requireTenant(session!.user.schoolId);

  const [currentYear, currentTerm, openApplications, feeInvoices] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
    }),
    prisma.term.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
      include: { academicYear: { select: { name: true } } },
    }),
    prisma.admissionApplication.count({
      where: {
        schoolId: tenant.schoolId,
        deletedAt: null,
        convertedStudentId: null,
        stage: { notIn: ["REJECTED", "WITHDRAWN"] },
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

  let feeOutstanding = new Decimal(0);
  for (const inv of feeInvoices) {
    feeOutstanding = feeOutstanding.plus(
      new Decimal(inv.totalAmount.toString()).minus(new Decimal(inv.amountPaid.toString())),
    );
  }

  const shortcuts = [
    {
      href: "/admissions/applications/new",
      label: "New application",
      description: "Start an intake",
      icon: Plus,
    },
    {
      href: "/admissions/applications",
      label: "Applications",
      description: "Search the pipeline",
      icon: FileText,
    },
    {
      href: "/admissions",
      label: "Admissions overview",
      description: "Pipeline health",
      icon: ClipboardList,
    },
    {
      href: "/settings/academic",
      label: "Academic years",
      description: "Years & terms",
      icon: CalendarRange,
    },
    {
      href: "/settings/classes",
      label: "Classes & sections",
      description: "Levels structure",
      icon: Layers,
    },
    {
      href: "/settings/fees",
      label: "Admission fee",
      description: "Configure amount",
      icon: Wallet,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back. Here’s what needs attention at ${tenant.school.name}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open applications"
          value={String(openApplications)}
          href="/admissions/applications"
        />
        <MetricCard
          label="Outstanding fees"
          value={formatGhs(feeOutstanding.toFixed(2))}
          href="/admissions"
        />
        <MetricCard
          label="Current year"
          value={currentYear?.name ?? "Not set"}
          detail={
            currentYear
              ? `${formatDateAccra(currentYear.startDate)} – ${formatDateAccra(currentYear.endDate)}`
              : "Set a year in Academic settings"
          }
          href="/settings/academic"
        />
        <MetricCard
          label="Current term"
          value={currentTerm?.name ?? "Not set"}
          detail={
            currentTerm
              ? `${currentTerm.academicYear.name} · ${formatDateAccra(currentTerm.startDate)} – ${formatDateAccra(currentTerm.endDate)}`
              : "Set a term in Academic settings"
          }
          href="/settings/academic"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Shortcuts</h2>
          <StatusBadge label="Active" tone="success" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="interactive-card surface-raised focus-ring flex items-center gap-3 p-4"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-50)] text-[var(--brand-700)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[var(--gray-900)]">
                    {item.label}
                  </span>
                  <span className="block text-[13px] text-[var(--gray-500)]">{item.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--gray-400)]" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href: string;
}) {
  return (
    <Link href={href} className="interactive-card surface-raised focus-ring block p-5">
      <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
        {label}
      </p>
      <p className="mt-2 font-variant-numeric tabular-nums text-[24px] font-semibold text-[var(--gray-900)]">
        {value}
      </p>
      {detail ? <p className="mt-1 text-[13px] text-[var(--gray-600)]">{detail}</p> : null}
    </Link>
  );
}
