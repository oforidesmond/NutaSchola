import {
  DocumentEntityType,
  InvoiceStatus,
  type AdmissionStage,
  type Prisma,
} from "@prisma/client";
import { AppError } from "@/lib/errors";
import { canConvertFromStage } from "@/lib/admissions/stages";
import { recordStageChange } from "@/lib/admissions/history";

type Tx = Prisma.TransactionClient;

function toAmount(value: { toString(): string } | string | number): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function invoiceIsFullyPaid(invoice: {
  totalAmount: { toString(): string } | string | number;
  amountPaid: { toString(): string } | string | number;
  status: InvoiceStatus;
}): boolean {
  if (invoice.status === InvoiceStatus.PAID) return true;
  const total = toAmount(invoice.totalAmount);
  const paid = toAmount(invoice.amountPaid);
  return paid >= total && total > 0;
}

/** Any payment recorded against the invoice (partial enrollment policy). */
export function invoiceHasAnyPayment(invoice: {
  amountPaid: { toString(): string } | string | number;
}): boolean {
  return toAmount(invoice.amountPaid) > 0;
}

/**
 * Convert admitted applicant → Student + Enrollment when any fee payment exists.
 * Caller must already enforce permissions and tenant scope.
 */
export async function convertApplicantToStudent(
  tx: Tx,
  input: {
    schoolId: string;
    applicationId: string;
    changedById: string;
    admissionNumber: string;
  },
) {
  const application = await tx.admissionApplication.findFirst({
    where: {
      id: input.applicationId,
      schoolId: input.schoolId,
      deletedAt: null,
    },
    include: {
      admissionFeeInvoice: true,
      guardians: true,
      academicYear: true,
    },
  });

  if (!application) {
    throw new AppError("NOT_FOUND", "Application not found.", { status: 404 });
  }

  if (application.convertedStudentId) {
    throw new AppError(
      "ALREADY_CONVERTED",
      "This applicant has already been converted to a student.",
      { status: 400 },
    );
  }

  if (!canConvertFromStage(application.stage)) {
    throw new AppError(
      "NOT_ADMITTED",
      "Applicant must be admitted before conversion.",
      { status: 400 },
    );
  }

  if (
    !application.admissionFeeInvoice ||
    !invoiceHasAnyPayment(application.admissionFeeInvoice)
  ) {
    throw new AppError(
      "FEE_UNPAID",
      "At least one payment must be recorded against the admission fee invoice before converting to a student.",
      { status: 400 },
    );
  }

  const student = await tx.student.create({
    data: {
      schoolId: input.schoolId,
      admissionNumber: input.admissionNumber,
      firstName: application.firstName,
      middleName: application.middleName,
      lastName: application.lastName,
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      photoUrl: application.photoUrl,
      homeAddress: application.homeAddress,
      nationality: application.nationality,
      admissionDate: new Date(),
      currentClassLevelId: application.classLevelAppliedId,
      isActive: true,
    },
  });

  for (const link of application.guardians) {
    await tx.studentGuardian.create({
      data: {
        studentId: student.id,
        guardianId: link.guardianId,
        relationship: link.relationship,
        isPrimaryContact: link.isPrimaryContact,
      },
    });
  }

  await tx.enrollment.create({
    data: {
      schoolId: input.schoolId,
      studentId: student.id,
      academicYearId: application.academicYearId,
      classLevelId: application.classLevelAppliedId,
      status: "ACTIVE",
    },
  });

  const fromStage = application.stage;
  const toStage: AdmissionStage = "ENROLLED";

  await tx.admissionApplication.update({
    where: { id: application.id },
    data: {
      convertedStudentId: student.id,
      stage: toStage,
      decisionDate: application.decisionDate ?? new Date(),
    },
  });

  await recordStageChange(tx, {
    applicationId: application.id,
    fromStage,
    toStage,
    changedById: input.changedById,
    note: "Converted applicant to student and enrolled for current academic year.",
  });

  return student;
}

export async function assertDocumentEntity(
  tx: Tx,
  schoolId: string,
  entityType: DocumentEntityType,
  entityId: string,
): Promise<void> {
  switch (entityType) {
    case DocumentEntityType.ADMISSION_APPLICATION: {
      const row = await tx.admissionApplication.findFirst({
        where: { id: entityId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!row) {
        throw new AppError(
          "INVALID_DOCUMENT_ENTITY",
          "Document must link to an application in this school.",
          { status: 400 },
        );
      }
      return;
    }
    case DocumentEntityType.STUDENT: {
      const row = await tx.student.findFirst({
        where: { id: entityId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!row) {
        throw new AppError(
          "INVALID_DOCUMENT_ENTITY",
          "Document must link to a student in this school.",
          { status: 400 },
        );
      }
      return;
    }
    case DocumentEntityType.GUARDIAN: {
      const row = await tx.guardian.findFirst({
        where: { id: entityId, schoolId },
        select: { id: true },
      });
      if (!row) {
        throw new AppError(
          "INVALID_DOCUMENT_ENTITY",
          "Document must link to a guardian in this school.",
          { status: 400 },
        );
      }
      return;
    }
    case DocumentEntityType.INVOICE: {
      const row = await tx.invoice.findFirst({
        where: { id: entityId, schoolId },
        select: { id: true },
      });
      if (!row) {
        throw new AppError(
          "INVALID_DOCUMENT_ENTITY",
          "Document must link to an invoice in this school.",
          { status: 400 },
        );
      }
      return;
    }
    case DocumentEntityType.STAFF:
    case DocumentEntityType.OTHER:
      // Soft allow — entity may not have a dedicated table check yet
      return;
    default:
      throw new AppError(
        "INVALID_DOCUMENT_ENTITY",
        "Unsupported document entity type.",
        { status: 400 },
      );
  }
}
