import Link from "next/link";
import type { AdmissionStage, ApplicationSource, Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { FeeProgress } from "@/components/ui/FeeProgress";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  ALL_FILTER_STAGES,
  admissionStageLabel,
  admissionStageTone,
} from "@/lib/admissions/stages";
import { SOURCE_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra } from "@/lib/format/currency";
import { ExportMenu } from "@/components/reports/ExportMenu";

const ALL_SOURCES = Object.keys(SOURCE_LABELS) as ApplicationSource[];
const PAGE_SIZE = 20;

type SearchParams = {
  name?: string;
  classLevelAppliedId?: string;
  stage?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

export default async function AdmissionApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, tenant } = await requirePageAccess(ACTIONS.ADMISSIONS_READ);
  const canCreate = can(user.role, ACTIONS.ADMISSIONS_CREATE);
  const sp = await searchParams;

  const name = sp.name?.trim() ?? "";
  const classLevelAppliedId = sp.classLevelAppliedId ?? "";
  const stage = sp.stage ?? "";
  const source = sp.source ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo = sp.dateTo ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.AdmissionApplicationWhereInput = {
    schoolId: tenant.schoolId,
    deletedAt: null,
  };

  if (name) {
    where.OR = [
      { firstName: { contains: name, mode: "insensitive" } },
      { lastName: { contains: name, mode: "insensitive" } },
    ];
  }
  if (classLevelAppliedId) where.classLevelAppliedId = classLevelAppliedId;
  if (stage && ALL_FILTER_STAGES.includes(stage as AdmissionStage)) {
    where.stage = stage as AdmissionStage;
  }
  if (source && ALL_SOURCES.includes(source as ApplicationSource)) {
    where.source = source as ApplicationSource;
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [classLevels, totalCount, applications] = await Promise.all([
    prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.admissionApplication.count({ where }),
    prisma.admissionApplication.findMany({
      where,
      include: {
        classLevelApplied: { select: { name: true } },
        admissionFeeInvoice: {
          select: { totalAmount: true, amountPaid: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildPageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (classLevelAppliedId) params.set("classLevelAppliedId", classLevelAppliedId);
    if (stage) params.set("stage", stage);
    if (source) params.set("source", source);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admissions/applications?${qs}` : "/admissions/applications";
  }

  function buildExportHref(format: "csv" | "pdf"): string {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (classLevelAppliedId) params.set("classLevelAppliedId", classLevelAppliedId);
    if (stage) params.set("stage", stage);
    if (source) params.set("source", source);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("format", format);
    return `/api/reports/admissions/applications?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        description="Search and filter every admission application for this school."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              links={[
                { label: "Export CSV", href: buildExportHref("csv") },
                { label: "Export PDF", href: buildExportHref("pdf") },
              ]}
            />
            {canCreate ? (
              <Link
                href="/admissions/applications/new"
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-600)] px-4 text-[15px] font-semibold text-white transition hover:bg-[var(--brand-700)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New application
              </Link>
            ) : null}
          </div>
        }
      />

      <form method="get" className="surface-raised grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex flex-col gap-2 lg:col-span-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Name</span>
          <input
            type="text"
            name="name"
            defaultValue={name}
            placeholder="First or last name"
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base shadow-[var(--shadow-sm)] focus:border-[var(--brand-600)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-100)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Class applied</span>
          <select
            name="classLevelAppliedId"
            defaultValue={classLevelAppliedId}
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          >
            <option value="">All classes</option>
            {classLevels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Stage</span>
          <select
            name="stage"
            defaultValue={stage}
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          >
            <option value="">All stages</option>
            {ALL_FILTER_STAGES.map((s) => (
              <option key={s} value={s}>
                {admissionStageLabel(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Source</span>
          <select
            name="source"
            defaultValue={source}
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          >
            <option value="">All sources</option>
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Created from</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Created to</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          />
        </label>

        <div className="flex items-end gap-2 lg:col-span-6">
          <Button type="submit">Search</Button>
          <Link
            href="/admissions/applications"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] px-4 text-[15px] font-medium text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
          >
            Clear filters
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
        <table className="min-w-full text-left text-[15px]">
          <thead className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Application #</th>
              <th className="px-4 py-2.5 font-semibold">Applicant</th>
              <th className="px-4 py-2.5 font-semibold">Class</th>
              <th className="px-4 py-2.5 font-semibold">Stage</th>
              <th className="px-4 py-2.5 font-semibold">Fee</th>
              <th className="px-4 py-2.5 font-semibold">Source</th>
              <th className="px-4 py-2.5 font-semibold">Created</th>
              <th className="px-4 py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const fullName = `${app.firstName} ${app.lastName}`;
              return (
                <tr key={app.id} className="interactive-row border-b border-[var(--gray-100)]">
                  <td className="px-4 py-2 font-variant-numeric tabular-nums text-[13px] text-[var(--gray-600)]">
                    {app.applicationNumber}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={fullName} size="sm" />
                      <span className="font-medium text-[var(--gray-900)]">{fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--gray-600)]">{app.classLevelApplied.name}</td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      label={admissionStageLabel(app.stage)}
                      tone={admissionStageTone(app.stage)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <FeeProgress amounts={app.admissionFeeInvoice} variant="compact" />
                  </td>
                  <td className="px-4 py-2 text-[13px] text-[var(--gray-600)]">
                    {SOURCE_LABELS[app.source]}
                  </td>
                  <td className="px-4 py-2 font-variant-numeric tabular-nums text-[13px] text-[var(--gray-600)]">
                    {formatDateAccra(app.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admissions/applications/${app.id}`}
                      className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] px-3 text-[15px] font-semibold text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[15px] text-[var(--gray-500)]">
                  No applications match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-[15px] text-[var(--gray-600)]">
          <p>
            Page {page} of {totalPages} · {totalCount} application{totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-3 font-medium ${
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--gray-100)]"
              }`}
            >
              Previous
            </Link>
            <Link
              href={buildPageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-3 font-medium ${
                page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[var(--gray-100)]"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
