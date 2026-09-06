import type { AdmissionStage, ApplicationSource, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { ALL_FILTER_STAGES, admissionStageLabel } from "@/lib/admissions/stages";
import { SOURCE_LABELS } from "@/lib/admissions/labels";
import { formatFeePaymentSummary } from "@/lib/admissions/fees";
import { formatDateAccra } from "@/lib/format/currency";
import {
  buildBrandedPdf,
  csvDownloadResponse,
  pdfDownloadResponse,
  rowsToCsv,
} from "@/lib/reports";
import { loadSchoolBrand } from "@/lib/reports/school";
import { AppError } from "@/lib/errors";

const ALL_SOURCES = Object.keys(SOURCE_LABELS) as ApplicationSource[];

function buildWhere(
  schoolId: string,
  sp: URLSearchParams,
): Prisma.AdmissionApplicationWhereInput {
  const where: Prisma.AdmissionApplicationWhereInput = {
    schoolId,
    deletedAt: null,
  };

  const name = sp.get("name")?.trim() ?? "";
  const classLevelAppliedId = sp.get("classLevelAppliedId") ?? "";
  const stage = sp.get("stage") ?? "";
  const source = sp.get("source") ?? "";
  const dateFrom = sp.get("dateFrom") ?? "";
  const dateTo = sp.get("dateTo") ?? "";

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

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_READ);
    const format = request.nextUrl.searchParams.get("format") ?? "csv";
    const where = buildWhere(tenant.schoolId, request.nextUrl.searchParams);

    const applications = await prisma.admissionApplication.findMany({
      where,
      include: {
        classLevelApplied: { select: { name: true } },
        admissionFeeInvoice: {
          select: { totalAmount: true, amountPaid: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const columns = [
      { key: "applicationNumber", header: "Application #" },
      { key: "applicant", header: "Applicant" },
      { key: "classApplied", header: "Class applied" },
      { key: "stage", header: "Stage" },
      { key: "fee", header: "Fee" },
      { key: "source", header: "Source" },
      { key: "created", header: "Created" },
    ] as const;

    const rows = applications.map((app) => ({
      applicationNumber: app.applicationNumber,
      applicant: `${app.firstName} ${app.lastName}`,
      classApplied: app.classLevelApplied.name,
      stage: admissionStageLabel(app.stage),
      fee: app.admissionFeeInvoice
        ? formatFeePaymentSummary(app.admissionFeeInvoice)
        : "No invoice",
      source: SOURCE_LABELS[app.source],
      created: formatDateAccra(app.createdAt),
    }));

    if (format === "pdf") {
      const school = await loadSchoolBrand(tenant.schoolId);
      const buffer = await buildBrandedPdf({
        school,
        title: "Admissions applications",
        subtitle: `${rows.length} application${rows.length === 1 ? "" : "s"} (current filters)`,
        columns: [...columns],
        rows,
      });
      return pdfDownloadResponse(buffer, "admissions-applications.pdf");
    }

    const csv = rowsToCsv([...columns], rows);
    return csvDownloadResponse(csv, "admissions-applications.csv");
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status ?? 400 },
      );
    }
    return Response.json(
      { error: { code: "INTERNAL", message: "Export failed." } },
      { status: 500 },
    );
  }
}
