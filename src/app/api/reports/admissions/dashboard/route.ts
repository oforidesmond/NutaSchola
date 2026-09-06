import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { ALL_FILTER_STAGES, admissionStageLabel } from "@/lib/admissions/stages";
import { formatGhs } from "@/lib/format/currency";
import { Decimal } from "@prisma/client/runtime/library";
import { csvDownloadResponse, rowsToCsv } from "@/lib/reports";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
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

    const stageCountByStage = new Map(stageGroups.map((g) => [g.stage, g._count._all]));
    const conversionRate =
      totalApplications > 0 ? (enrolledCount / totalApplications) * 100 : 0;

    let feeInvoiced = new Decimal(0);
    let feePaid = new Decimal(0);
    for (const inv of feeInvoices) {
      feeInvoiced = feeInvoiced.plus(new Decimal(inv.totalAmount.toString()));
      feePaid = feePaid.plus(new Decimal(inv.amountPaid.toString()));
    }
    const feeOutstandingTotal = feeInvoiced.minus(feePaid);

    const classLevelIds = classGroups.map((g) => g.classLevelAppliedId);
    const classLevels = classLevelIds.length
      ? await prisma.classLevel.findMany({
          where: { id: { in: classLevelIds } },
          select: { id: true, name: true },
        })
      : [];
    const classNameById = new Map(classLevels.map((c) => [c.id, c.name]));

    const columns = [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
    ] as const;

    const rows = [
      { metric: "Total applications", value: String(totalApplications) },
      { metric: "Enrolled (converted)", value: String(enrolledCount) },
      { metric: "Inquiry → enrolled %", value: conversionRate.toFixed(1) },
      { metric: "Fees invoiced", value: formatGhs(feeInvoiced.toFixed(2)) },
      { metric: "Fees paid", value: formatGhs(feePaid.toFixed(2)) },
      { metric: "Fees outstanding", value: formatGhs(feeOutstandingTotal.toFixed(2)) },
      ...ALL_FILTER_STAGES.map((stage) => ({
        metric: `Stage: ${admissionStageLabel(stage)}`,
        value: String(stageCountByStage.get(stage) ?? 0),
      })),
      ...classGroups.map((g) => ({
        metric: `Class: ${classNameById.get(g.classLevelAppliedId) ?? "Unknown"}`,
        value: String(g._count._all),
      })),
    ];

    const csv = rowsToCsv([...columns], rows);
    return csvDownloadResponse(csv, "admissions-dashboard.csv");
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
