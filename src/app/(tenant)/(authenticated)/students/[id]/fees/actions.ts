"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import {
  generateSchoolFeesInvoice,
  notifySchoolFeePayment,
  recordInvoicePayment,
} from "@/lib/fees";
import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { resolvePrimaryGuardianContact } from "@/lib/sms";

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}

export async function generateStudentSchoolFeesInvoiceAction(
  studentId: string,
  termId: string,
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: tenant.schoolId, deletedAt: null },
    });
    if (!student) return fail("NOT_FOUND", "Student not found.");

    const invoice = await generateSchoolFeesInvoice(prisma, {
      schoolId: tenant.schoolId,
      studentId,
      termId,
    });

    revalidatePath(`/students/${studentId}/fees`);
    return ok({ invoiceId: invoice.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const paymentSchema = z.object({
  studentId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.string().min(1),
  reference: z.string().optional(),
});

export async function recordSchoolFeePaymentAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true; receiptNumber: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);
    const parsed = paymentSchema.safeParse({
      studentId: formData.get("studentId"),
      invoiceId: formData.get("invoiceId"),
      amount: formData.get("amount"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.");
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parsed.data.invoiceId,
        schoolId: tenant.schoolId,
        studentId: parsed.data.studentId,
      },
      include: {
        student: true,
        feeStructure: true,
      },
    });
    if (!invoice || invoice.feeStructure?.feeType !== "SCHOOL_FEES") {
      return fail("NOT_FOUND", "School fees invoice not found.");
    }

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
        receiptPrefix: "FEE",
      }),
    );

    const total = Number(invoice.totalAmount.toString());
    const outstanding = Math.max(0, total - recorded.newPaid);
    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: tenant.schoolId },
    });

    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { studentId: invoice.studentId! },
      include: { guardian: true },
      orderBy: { isPrimaryContact: "desc" },
    });
    const primary = studentGuardians[0]?.guardian ?? null;

    // Prefer application primary contact helper when available via admission link
    let guardian = primary
      ? {
          firstName: primary.firstName,
          lastName: primary.lastName,
          email: primary.email,
          phone: primary.phone,
        }
      : null;

    const application = await prisma.admissionApplication.findFirst({
      where: { convertedStudentId: invoice.studentId },
      select: { id: true },
    });
    if (application) {
      const fromApp = await resolvePrimaryGuardianContact(application.id);
      if (fromApp) guardian = fromApp;
    }

    const studentName = invoice.student
      ? `${invoice.student.firstName} ${invoice.student.lastName}`
      : "Student";

    await notifySchoolFeePayment({
      schoolId: tenant.schoolId,
      schoolName: tenant.school.name,
      enableEmailNotifications: settings?.enableEmailNotifications ?? false,
      enableSmsNotifications: settings?.enableSmsNotifications ?? false,
      guardian,
      studentName,
      amountPaid: recorded.amount.toFixed(2),
      methodLabel: PAYMENT_METHOD_LABELS[method] ?? method,
      outstanding: outstanding.toFixed(2),
      receiptNumber: recorded.receiptNumber,
    });

    revalidatePath(`/students/${parsed.data.studentId}/fees`);
    return ok({ saved: true, receiptNumber: recorded.receiptNumber });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
