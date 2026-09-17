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
import { notifyStageChange, notifyAdmissionFeeDue, notifyAdmissionFeePayment, notifyAdmissionFeeArrears } from "@/lib/admissions/notify";
import { resolvePrimaryGuardianContact, normalizeGhPhone } from "@/lib/sms";
import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { feeOutstanding } from "@/lib/admissions/fees";
import { generateSchoolFeesInvoice, recordInvoicePayment } from "@/lib/fees";

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

    const phone = normalizeGhPhone(data.phone);
    if (!phone) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", {
        phone: ["Invalid Ghana phone number"],
      });
    }

    let altPhone: string | undefined;
    if (data.altPhone?.trim()) {
      const normalizedAlt = normalizeGhPhone(data.altPhone);
      if (!normalizedAlt) {
        return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", {
          altPhone: ["Invalid Ghana phone number"],
        });
      }
      altPhone = normalizedAlt;
    }

    const guardianId = await prisma.$transaction(async (tx) => {
      const guardian = await findOrCreateGuardian(tx, tenant.schoolId, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone,
        altPhone,
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
      schoolId: tenant.schoolId,
      schoolName: tenant.school.name,
      enableEmailNotifications: settings?.enableEmailNotifications ?? false,
      enableSmsNotifications: settings?.enableSmsNotifications ?? false,
      applicantName: `${application.firstName} ${application.lastName}`,
      applicationNumber: application.applicationNumber,
      stage: toStage,
      guardian: primary
        ? {
            firstName: primary.firstName,
            lastName: primary.lastName,
            email: primary.email,
            phone: primary.phone,
          }
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

    if (application.admissionFeeWaived) {
      return fail(
        "FEE_WAIVED",
        "Admission fee is waived for this application — no invoice will be generated.",
      );
    }

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
          feeType: "ADMISSION",
          classLevelId: application.classLevelAppliedId,
        },
        include: { items: true },
      })) ??
      (await prisma.feeStructure.findFirst({
        where: { schoolId: tenant.schoolId, feeType: "ADMISSION", classLevelId: null },
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

    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: tenant.schoolId } });
    const guardian = await resolvePrimaryGuardianContact(application.id);
    await notifyAdmissionFeeDue({
      schoolId: tenant.schoolId,
      schoolName: tenant.school.name,
      enableSmsNotifications: settings?.enableSmsNotifications ?? false,
      guardian,
      applicantName: `${application.firstName} ${application.lastName}`,
      amountDue: totalAmount,
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
    const method = parsed.data.method as PaymentMethod;

    const recorded = await prisma.$transaction(async (tx) =>
      recordInvoicePayment(tx, {
        schoolId: tenant.schoolId,
        invoiceId: invoice.id,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        paymentAmount: parsed.data.amount,
        method,
        reference: parsed.data.reference,
        receiptPrefix: "ADM",
      }),
    );

    const outstanding = Math.max(0, total - recorded.newPaid);
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: tenant.schoolId } });
    const guardian = await resolvePrimaryGuardianContact(application.id);
    await notifyAdmissionFeePayment({
      schoolId: tenant.schoolId,
      schoolName: tenant.school.name,
      enableSmsNotifications: settings?.enableSmsNotifications ?? false,
      guardian,
      applicantName: `${application.firstName} ${application.lastName}`,
      amountPaid: recorded.amount.toFixed(2),
      methodLabel: PAYMENT_METHOD_LABELS[method] ?? method,
      outstanding: outstanding.toFixed(2),
    });

    revalidateApplication(application.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const waiverSchema = z.object({
  applicationId: z.string().min(1),
  waived: z.enum(["true", "false"]),
  reason: z.string().optional(),
});

export async function updateAdmissionFeeWaiverAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_WAIVE);
    const parsed = waiverSchema.safeParse({
      applicationId: formData.get("applicationId"),
      waived: formData.get("waived") === "true" ? "true" : "false",
      reason: (formData.get("reason") as string) || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const application = await loadApplicationOrThrow(
      tenant.schoolId,
      parsed.data.applicationId,
    );
    if (application.convertedStudentId) {
      return fail(
        "ALREADY_CONVERTED",
        "Cannot change the admission fee waiver after conversion.",
      );
    }

    const waived = parsed.data.waived === "true";
    await prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        admissionFeeWaived: waived,
        admissionFeeWaivedReason: waived
          ? parsed.data.reason?.trim() || null
          : null,
      },
    });

    revalidateApplication(application.id);
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function sendAdmissionFeeArrearsReminderAction(
  applicationId: string,
): Promise<ActionResult<{ sent: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_FEES);
    const application = await prisma.admissionApplication.findFirst({
      where: { id: applicationId, schoolId: tenant.schoolId, deletedAt: null },
      include: { admissionFeeInvoice: true },
    });
    if (!application) return fail("NOT_FOUND", "Application not found.");
    if (!application.admissionFeeInvoice) {
      return fail("NOT_FOUND", "No admission fee invoice exists for this application.");
    }

    const outstanding = feeOutstanding(application.admissionFeeInvoice);
    if (outstanding <= 0) {
      return fail("ALREADY_PAID", "This invoice has no outstanding balance.");
    }

    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: tenant.schoolId } });
    if (!settings?.enableSmsNotifications) {
      return fail(
        "SMS_DISABLED",
        "SMS notifications are disabled for this school. Enable them in School settings.",
      );
    }

    const guardian = await resolvePrimaryGuardianContact(application.id);
    if (!guardian?.phone) {
      return fail("NO_PHONE", "No guardian phone number is on file for this application.");
    }

    const result = await notifyAdmissionFeeArrears({
      schoolId: tenant.schoolId,
      schoolName: tenant.school.name,
      enableSmsNotifications: true,
      guardian,
      applicantName: `${application.firstName} ${application.lastName}`,
      outstanding: outstanding.toFixed(2),
    });

    if (result.status === "failed") {
      return fail("SMS_FAILED", result.reason || "Failed to send SMS reminder.");
    }
    if (result.status === "skipped") {
      return fail("SMS_SKIPPED", result.reason || "SMS reminder was skipped.");
    }

    revalidateApplication(application.id);
    return ok({ sent: true });
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

    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
      select: { id: true },
    });
    if (currentTerm) {
      try {
        await generateSchoolFeesInvoice(prisma, {
          schoolId: tenant.schoolId,
          studentId: student.id,
          termId: currentTerm.id,
        });
      } catch (error) {
        // Conversion succeeded; school-fees invoice can be generated later from student fees page.
        console.error("generateSchoolFeesInvoice_after_convert", error);
      }
    }

    revalidateApplication(applicationId);
    revalidatePath(`/students/${student.id}/fees`);
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
