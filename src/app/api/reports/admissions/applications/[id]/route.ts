import { NextRequest } from "next/server";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { admissionStageLabel } from "@/lib/admissions/stages";
import { RELATIONSHIP_LABELS, GENDER_LABELS } from "@/lib/admissions/labels";
import { formatFeePaymentSummary, feeOutstanding } from "@/lib/admissions/fees";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import { buildBrandedPdf, pdfDownloadResponse } from "@/lib/reports";
import { loadSchoolBrand } from "@/lib/reports/school";
import { AppError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_READ);

    const application = await prisma.admissionApplication.findFirst({
      where: { id, schoolId: tenant.schoolId, deletedAt: null },
      include: {
        classLevelApplied: { select: { name: true } },
        academicYear: { select: { name: true } },
        guardians: {
          include: { guardian: true },
          orderBy: { isPrimaryContact: "desc" },
        },
        admissionFeeInvoice: {
          include: { payments: { orderBy: { createdAt: "desc" } } },
        },
      },
    });

    if (!application) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Application not found." } },
        { status: 404 },
      );
    }

    const school = await loadSchoolBrand(tenant.schoolId);
    const invoice = application.admissionFeeInvoice;

    const guardianLines = application.guardians.map((g) => {
      const role = g.isPrimaryContact ? "Primary" : "Contact";
      return `${role}: ${g.guardian.firstName} ${g.guardian.lastName} (${RELATIONSHIP_LABELS[g.relationship]}) · ${g.guardian.phone}${g.guardian.email ? ` · ${g.guardian.email}` : ""}`;
    });

    const feeLines = invoice
      ? [
          `Invoice ${invoice.invoiceNumber}`,
          formatFeePaymentSummary(invoice),
          `Invoiced ${formatGhs(invoice.totalAmount.toString())}`,
          `Paid ${formatGhs(invoice.amountPaid.toString())}`,
          `Outstanding ${formatGhs(feeOutstanding(invoice).toFixed(2))}`,
          ...invoice.payments.map(
            (p) =>
              `Payment ${formatGhs(p.amount.toString())}${p.paidAt ? ` on ${formatDateAccra(p.paidAt)}` : ""}`,
          ),
        ]
      : ["No admission fee invoice generated yet."];

    const buffer = await buildBrandedPdf({
      school,
      title: "Applicant summary / fee receipt",
      subtitle: application.applicationNumber,
      sections: [
        {
          heading: "Applicant",
          lines: [
            `${application.firstName} ${application.middleName ? `${application.middleName} ` : ""}${application.lastName}`,
            `Date of birth: ${formatDateAccra(application.dateOfBirth)}`,
            `Gender: ${GENDER_LABELS[application.gender]}`,
            `Nationality: ${application.nationality}`,
            application.homeAddress ? `Address: ${application.homeAddress}` : "",
            `Class applied: ${application.classLevelApplied.name}`,
            `Academic year: ${application.academicYear.name}`,
            `Stage: ${admissionStageLabel(application.stage)}`,
          ].filter(Boolean),
        },
        {
          heading: "Guardians",
          lines: guardianLines.length > 0 ? guardianLines : ["No guardians linked."],
        },
        {
          heading: "Admission fee",
          lines: feeLines,
        },
      ],
    });

    return pdfDownloadResponse(
      buffer,
      `applicant-${application.applicationNumber}.pdf`,
    );
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
