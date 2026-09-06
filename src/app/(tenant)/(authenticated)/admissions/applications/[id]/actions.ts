"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  AdmissionStage,
  Gender,
  RelationshipType,
  type PaymentMethod,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { AppError, fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { recordStageChange } from "@/lib/admissions/history";
import { canConvertFromStage, MANUAL_STAGES } from "@/lib/admissions/stages";
import { convertApplicantToStudent } from "@/lib/admissions/convert";
import { nextAdmissionNumber } from "@/lib/admissions/numbering";
import { findOrCreateGuardian, linkGuardianToApplication } from "@/lib/admissions/guardians";
import { notifyStageChange } from "@/lib/admissions/notify";

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}

async function loadApplicationOrThrow(schoolId: string, id: string) {
  const application = await prisma.admissionApplication.findFirst({
    where: { id, schoolId, deletedAt: null },
  });
  if (!application) {
    throw new AppError("NOT_FOUND", "Application not found.", { status: 404 });
  }
  return application;
}

function revalidateApplication(id: string) {
  revalidatePath(`/admissions/applications/${id}`);
  revalidatePath("/admissions/applications");
  revalidatePath("/admissions");
}

// ---------------------------------------------------------------------------
// Bio edit
// ---------------------------------------------------------------------------

const bioEditSchema = z.object({
  applicationId: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.nativeEnum(Gender),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  homeAddress: z.string().optional(),
  previousSchoolName: z.string().optional(),
  previousClassCompleted: z.string().optional(),
});

export async function updateApplicationBio(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const parsed = bioEditSchema.safeParse({
      applicationId: formData.get("applicationId"),
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName") || undefined,
      lastName: formData.get("lastName"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender: formData.get("gender"),
      nationality: formData.get("nationality") || undefined,
      religion: formData.get("religion") || undefined,
      homeAddress: formData.get("homeAddress") || undefined,
      previousSchoolName: formData.get("previousSchoolName") || undefined,
      previousClassCompleted: formData.get("previousClassCompleted") || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const application = await loadApplicationOrThrow(tenant.schoolId, parsed.data.applicationId);

    await prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        firstName: parsed.data.firstName.trim(),
        middleName: parsed.data.middleName?.trim() || null,
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        gender: parsed.data.gender,
        nationality: parsed.data.nationality?.trim() || null,
        religion: parsed.data.religion?.trim() || null,
        homeAddress: parsed.data.homeAddress?.trim() || null,
        previousSchoolName: parsed.data.previousSchoolName?.trim() || null,
        previousClassCompleted: parsed.data.previousClassCompleted?.trim() || null,
      },
    });

    revalidateApplication(application.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

// ---------------------------------------------------------------------------
// Guardians
// ---------------------------------------------------------------------------

const addGuardianSchema = z.object({
  applicationId: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(6, "Phone number is required"),
  altPhone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  occupation: z.string().optional(),
  address: z.string().optional(),
  relationship: z.nativeEnum(RelationshipType),
  isPrimaryContact: z.boolean().optional(),
});

export async function addGuardianToApplication(
  formData: FormData,
): Promise<ActionResult<{ guardianId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const parsed = addGuardianSchema.safeParse({
      applicationId: formData.get("applicationId"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
      altPhone: formData.get("altPhone") || undefined,
      email: formData.get("email") || "",
      occupation: formData.get("occupation") || undefined,
      address: formData.get("address") || undefined,
      relationship: formData.get("relationship"),
      isPrimaryContact: formData.get("isPrimaryContact") === "on",
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const application = await loadApplicationOrThrow(tenant.schoolId, parsed.data.applicationId);
    const data = parsed.data;

    const guardianId = await prisma.$transaction(async (tx) => {
      const guardian = await findOrCreateGuardian(tx, tenant.schoolId, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        altPhone: data.altPhone,
        email: data.email,
        occupation: data.occupation,
        address: data.address,
      });
      await linkGuardianToApplication(tx, {
        applicationId: application.id,
        guardianId: guardian.id,
        relationship: data.relationship,
        isPrimaryContact: Boolean(data.isPrimaryContact),
      });
      return guardian.id;
    });

    revalidateApplication(application.id);
    return ok({ guardianId });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

// ---------------------------------------------------------------------------
// Stage change
// ---------------------------------------------------------------------------

const stageSchema = z.object({
  applicationId: z.string().min(1),
  toStage: z.nativeEnum(AdmissionStage),
  note: z.string().optional(),
});

export async function changeApplicationStageAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.ADMISSIONS_STAGE);
    const parsed = stageSchema.safeParse({
      applicationId: formData.get("applicationId"),
      toStage: formData.get("toStage"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }
    if (!MANUAL_STAGES.includes(parsed.data.toStage)) {
      return fail(
        "INVALID_STAGE",
        "Enrolled status is only set automatically by converting the applicant to a student.",
      );
    }

    const application = await prisma.admissionApplication.findFirst({
      where: { id: parsed.data.applicationId, schoolId: tenant.schoolId, deletedAt: null },
      include: {
        guardians: {
          where: { isPrimaryContact: true },
          include: { guardian: true },
          take: 1,
        },
      },
    });
    if (!application) return fail("NOT_FOUND", "Application not found.");
    if (application.convertedStudentId) {
      return fail(
        "ALREADY_CONVERTED",
        "This applicant has already been converted to a student; the stage is locked.",
      );
    }
    if (application.stage === parsed.data.toStage) {
      return fail("NO_CHANGE", "Application is already at that stage.");
    }

    const fromStage = application.stage;
    const toStage = parsed.data.toStage;
    const isDecision = toStage === "ADMITTED" || toStage === "REJECTED";
    const note = parsed.data.note?.trim() || null;

    await prisma.$transaction(async (tx) => {
      await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          stage: toStage,
          decisionDate: isDecision ? new Date() : application.decisionDate,
          decisionNotes: isDecision ? note ?? application.decisionNotes : application.decisionNotes,
          rejectionReason: toStage === "REJECTED" ? note : application.rejectionReason,
        },
      });

      await recordStageChange(tx, {
        applicationId: application.id,
        fromStage,
        toStage,
        changedById: user.id,
        note,
      });
    });

    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: tenant.schoolId } });
    const primary = application.guardians[0]?.guardian ?? null;
    await notifyStageChange({
      schoolName: tenant.school.name,
      enableEmailNotifications: settings?.enableEmailNotifications ?? false,
      applicantName: `${application.firstName} ${application.lastName}`,
      applicationNumber: application.applicationNumber,
      stage: toStage,
      guardian: primary
        ? { firstName: primary.firstName, lastName: primary.lastName, email: primary.email }
        : null,
      note,
    });

    revalidateApplication(application.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

// ---------------------------------------------------------------------------
// Admission fee: invoice + payment
// ---------------------------------------------------------------------------

export async function generateAdmissionFeeInvoiceAction(
  applicationId: string,
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_FEES);
    const application = await loadApplicationOrThrow(tenant.schoolId, applicationId);

    if (application.admissionFeeInvoiceId) {
      return fail(
        "ALREADY_EXISTS",
        "An admission fee invoice already exists for this application.",
      );
    }

    const feeStructure =
      (await prisma.feeStructure.findFirst({
        where: {
          schoolId: tenant.schoolId,
          isAdmissionFee: true,
          classLevelId: application.classLevelAppliedId,
        },
        include: { items: true },
      })) ??
      (await prisma.feeStructure.findFirst({
        where: { schoolId: tenant.schoolId, isAdmissionFee: true, classLevelId: null },
        include: { items: true },
      }));

    if (!feeStructure || feeStructure.items.length === 0) {
      return fail(
        "NOT_FOUND",
        "No admission fee structure is configured for this school yet.",
      );
    }

    const totalAmount = feeStructure.items
      .reduce((sum, item) => sum + Number(item.amount.toString()), 0)
      .toFixed(2);

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          schoolId: tenant.schoolId,
          invoiceNumber: `INV-${application.applicationNumber}`,
          feeStructureId: feeStructure.id,
          academicYearId: application.academicYearId,
          totalAmount,
          amountPaid: "0",
          status: "ISSUED",
          items: {
            create: feeStructure.items.map((item) => ({
              feeItemId: item.id,
              description: item.name,
              amount: item.amount,
            })),
          },
        },
      });

      await tx.admissionApplication.update({
        where: { id: application.id },
        data: { admissionFeeInvoiceId: created.id },
      });

      return created;
    });

    revalidateApplication(application.id);
    return ok({ invoiceId: invoice.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const paymentSchema = z.object({
  applicationId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.string().min(1, "Select a payment method"),
  reference: z.string().optional(),
});

export async function recordAdmissionFeePaymentAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_FEES);
    const parsed = paymentSchema.safeParse({
      applicationId: formData.get("applicationId"),
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const application = await prisma.admissionApplication.findFirst({
      where: { id: parsed.data.applicationId, schoolId: tenant.schoolId, deletedAt: null },
      include: { admissionFeeInvoice: true },
    });
    if (!application) return fail("NOT_FOUND", "Application not found.");
    if (!application.admissionFeeInvoice) {
      return fail(
        "NOT_FOUND",
        "Generate the admission fee invoice before recording a payment.",
      );
    }

    const invoice = application.admissionFeeInvoice;
    const total = Number(invoice.totalAmount.toString());
    const alreadyPaid = Number(invoice.amountPaid.toString());
    const balance = total - alreadyPaid;
    const amount = Number(parsed.data.amount.toFixed(2));

    if (balance <= 0) {
      return fail("ALREADY_PAID", "This invoice is already fully paid.");
    }
    if (amount > balance) {
      return fail(
        "AMOUNT_EXCEEDS_BALANCE",
        `Amount exceeds the outstanding balance of GHS ${balance.toFixed(2)}.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          schoolId: tenant.schoolId,
          invoiceId: invoice.id,
          amount: amount.toFixed(2),
          method: parsed.data.method as PaymentMethod,
          status: "SUCCESSFUL",
          reference: parsed.data.reference?.trim() || null,
          paidAt: new Date(),
        },
      });

      const newPaid = alreadyPaid + amount;
      const newStatus = newPaid >= total ? "PAID" : "PARTIALLY_PAID";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid.toFixed(2), status: newStatus },
      });
    });

    revalidateApplication(application.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

// ---------------------------------------------------------------------------
// Convert + delete
// ---------------------------------------------------------------------------

export async function convertApplicationAction(
  applicationId: string,
): Promise<ActionResult<{ studentId: string }>> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.ADMISSIONS_CONVERT);

    const application = await loadApplicationOrThrow(tenant.schoolId, applicationId);
    if (!canConvertFromStage(application.stage)) {
      return fail(
        "NOT_ADMITTED",
        "Applicant must be Admitted (or have accepted the offer) before conversion.",
      );
    }

    const student = await prisma.$transaction(async (tx) => {
      const admissionNumber = await nextAdmissionNumber(tx, tenant.schoolId);
      return convertApplicantToStudent(tx, {
        schoolId: tenant.schoolId,
        applicationId,
        changedById: user.id,
        admissionNumber,
      });
    });

    revalidateApplication(applicationId);
    return ok({ studentId: student.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function deleteApplicationAction(
  applicationId: string,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const application = await loadApplicationOrThrow(tenant.schoolId, applicationId);

    if (application.convertedStudentId) {
      return fail(
        "ALREADY_CONVERTED",
        "This application has already been converted to a student and cannot be deleted.",
      );
    }

    await prisma.admissionApplication.update({
      where: { id: application.id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/admissions/applications");
    revalidatePath("/admissions");
    return ok({ deleted: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
