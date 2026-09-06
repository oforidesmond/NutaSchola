import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";
import { Breadcrumb } from "@/components/ui/Card";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  admissionStageLabel,
  admissionStageTone,
  canConvertFromStage,
  lastTrackStageFromHistory,
} from "@/lib/admissions/stages";
import { invoiceHasAnyPayment } from "@/lib/admissions/convert";
import { AdmissionStageTracker } from "@/components/admissions/AdmissionStageTracker";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ApplicationWorkspace } from "./ApplicationWorkspace";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireAction(ACTIONS.ADMISSIONS_READ);

  const application = await prisma.admissionApplication.findFirst({
    where: { id, schoolId: tenant.schoolId, deletedAt: null },
    include: {
      classLevelApplied: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
      guardians: {
        include: { guardian: true },
        orderBy: { isPrimaryContact: "desc" },
      },
      statusHistory: { orderBy: { createdAt: "desc" } },
      admissionFeeInvoice: {
        include: {
          items: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
      convertedStudent: { select: { id: true, admissionNumber: true } },
    },
  });

  if (!application) notFound();

  const documents = await prisma.document.findMany({
    where: {
      schoolId: tenant.schoolId,
      entityType: "ADMISSION_APPLICATION",
      entityId: application.id,
    },
    orderBy: { createdAt: "desc" },
  });

  const alreadyConverted = Boolean(application.convertedStudentId);
  const feeHasPayment = application.admissionFeeInvoice
    ? invoiceHasAnyPayment(application.admissionFeeInvoice)
    : false;
  const eligibleStage = canConvertFromStage(application.stage);
  const canConvert = !alreadyConverted && eligibleStage && feeHasPayment;

  let convertBlockedReason: string | null = null;
  if (!alreadyConverted) {
    if (!eligibleStage) {
      convertBlockedReason = "Applicant must be Admitted before conversion.";
    } else if (!feeHasPayment) {
      convertBlockedReason =
        "Record at least one payment against the admission fee invoice before conversion.";
    }
  }

  const freezeAtStage = lastTrackStageFromHistory(application.statusHistory);
  const fullName = `${application.firstName} ${application.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Admissions", href: "/admissions" },
            { label: "Applications", href: "/admissions/applications" },
            { label: fullName },
          ]}
        />
        <PageHeader
          title={fullName}
          description={`${application.applicationNumber} · Applied for ${application.classLevelApplied.name} · ${application.academicYear.name}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <ExportMenu
                links={[
                  {
                    label: "Export PDF",
                    href: `/api/reports/admissions/applications/${application.id}`,
                  },
                ]}
              />
              <StatusBadge
                label={admissionStageLabel(application.stage)}
                tone={admissionStageTone(application.stage)}
              />
            </div>
          }
        />
      </div>

      <AdmissionStageTracker stage={application.stage} freezeAtStage={freezeAtStage} />

      <ApplicationWorkspace
        application={{
          id: application.id,
          applicationNumber: application.applicationNumber,
          firstName: application.firstName,
          middleName: application.middleName,
          lastName: application.lastName,
          dateOfBirth: application.dateOfBirth.toISOString().slice(0, 10),
          gender: application.gender,
          nationality: application.nationality,
          religion: application.religion,
          homeAddress: application.homeAddress,
          photoUrl: application.photoUrl,
          previousSchoolName: application.previousSchoolName,
          previousClassCompleted: application.previousClassCompleted,
          stage: application.stage,
          classLevelAppliedName: application.classLevelApplied.name,
          academicYearName: application.academicYear.name,
          rejectionReason: application.rejectionReason,
          decisionNotes: application.decisionNotes,
          convertedStudent: application.convertedStudent,
        }}
        guardians={application.guardians.map((g) => ({
          applicationGuardianId: g.id,
          guardianId: g.guardianId,
          firstName: g.guardian.firstName,
          lastName: g.guardian.lastName,
          phone: g.guardian.phone,
          altPhone: g.guardian.altPhone,
          email: g.guardian.email,
          relationship: g.relationship,
          isPrimaryContact: g.isPrimaryContact,
        }))}
        documents={documents.map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName,
          blobUrl: d.blobUrl,
          createdAt: d.createdAt.toISOString(),
        }))}
        statusHistory={application.statusHistory.map((h) => ({
          id: h.id,
          fromStage: h.fromStage,
          toStage: h.toStage,
          note: h.note,
          createdAt: h.createdAt.toISOString(),
        }))}
        invoice={
          application.admissionFeeInvoice
            ? {
                id: application.admissionFeeInvoice.id,
                invoiceNumber: application.admissionFeeInvoice.invoiceNumber,
                totalAmount: application.admissionFeeInvoice.totalAmount.toString(),
                amountPaid: application.admissionFeeInvoice.amountPaid.toString(),
                status: application.admissionFeeInvoice.status,
                items: application.admissionFeeInvoice.items.map((item) => ({
                  id: item.id,
                  description: item.description,
                  amount: item.amount.toString(),
                })),
                payments: application.admissionFeeInvoice.payments.map((p) => ({
                  id: p.id,
                  amount: p.amount.toString(),
                  method: p.method,
                  reference: p.reference,
                  paidAt: p.paidAt ? p.paidAt.toISOString() : null,
                })),
              }
            : null
        }
        canConvert={canConvert}
        convertBlockedReason={convertBlockedReason}
        alreadyConverted={alreadyConverted}
      />
    </div>
  );
}
