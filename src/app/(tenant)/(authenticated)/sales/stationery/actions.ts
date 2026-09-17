"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { createStationerySale, notifyStationerySale } from "@/lib/sales";
import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { buildPaymentReceiptPdf, pdfDownloadResponse } from "@/lib/reports";
import { loadSchoolBrand } from "@/lib/reports/school";

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}

const itemSchema = z.object({
  name: z.string().min(1).max(120),
  unitPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/),
  stockQuantity: z.coerce.number().int().min(0),
  isActive: z.enum(["true", "false"]).optional(),
});

export async function createStationeryItemAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);
    const parsed = itemSchema.safeParse({
      name: formData.get("name"),
      unitPrice: formData.get("unitPrice"),
      stockQuantity: formData.get("stockQuantity"),
      isActive: formData.get("isActive") === "false" ? "false" : "true",
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the item fields.");
    }

    const item = await prisma.stationeryItem.create({
      data: {
        schoolId: tenant.schoolId,
        name: parsed.data.name.trim(),
        unitPrice: new Decimal(parsed.data.unitPrice),
        stockQuantity: parsed.data.stockQuantity,
        isActive: parsed.data.isActive !== "false",
      },
    });

    revalidatePath("/sales/stationery");
    revalidatePath("/sales/stationery/stock");
    return ok({ id: item.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function updateStationeryItemAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);
    const id = String(formData.get("id") ?? "");
    const parsed = itemSchema.safeParse({
      name: formData.get("name"),
      unitPrice: formData.get("unitPrice"),
      stockQuantity: formData.get("stockQuantity"),
      isActive: formData.get("isActive") === "false" ? "false" : "true",
    });
    if (!id || !parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the item fields.");
    }

    const existing = await prisma.stationeryItem.findFirst({
      where: { id, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Item not found.");

    await prisma.stationeryItem.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        unitPrice: new Decimal(parsed.data.unitPrice),
        stockQuantity: parsed.data.stockQuantity,
        isActive: parsed.data.isActive !== "false",
      },
    });

    revalidatePath("/sales/stationery");
    revalidatePath("/sales/stationery/stock");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const saleSchema = z.object({
  studentId: z.string().optional(),
  method: z.string().min(1),
  linesJson: z.string().min(2),
});

export async function recordStationerySaleAction(
  formData: FormData,
): Promise<ActionResult<{ saleId: string; receiptNumber: string }>> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.SALES_RECORD);
    const parsed = saleSchema.safeParse({
      studentId: formData.get("studentId") || undefined,
      method: formData.get("method"),
      linesJson: formData.get("linesJson"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid sale payload.");
    }

    const lines = JSON.parse(parsed.data.linesJson) as {
      itemId: string;
      quantity: number;
    }[];

    const sale = await prisma.$transaction(async (tx) =>
      createStationerySale(tx, {
        schoolId: tenant.schoolId,
        recordedById: user.id,
        studentId: parsed.data.studentId || null,
        method: parsed.data.method as PaymentMethod,
        lines,
      }),
    );

    const receiptNumber = sale.receipt?.receiptNumber ?? "";
    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: tenant.schoolId },
    });

    if (sale.studentId) {
      const link = await prisma.studentGuardian.findFirst({
        where: { studentId: sale.studentId, isPrimaryContact: true },
        include: { guardian: true },
      });
      const guardian = link?.guardian
        ? {
            firstName: link.guardian.firstName,
            lastName: link.guardian.lastName,
            email: link.guardian.email,
            phone: link.guardian.phone,
          }
        : null;
      const studentName = sale.student
        ? `${sale.student.firstName} ${sale.student.lastName}`
        : "Student";
      const method = parsed.data.method as PaymentMethod;
      await notifyStationerySale({
        schoolId: tenant.schoolId,
        schoolName: tenant.school.name,
        enableEmailNotifications: settings?.enableEmailNotifications ?? false,
        enableSmsNotifications: settings?.enableSmsNotifications ?? false,
        guardian,
        studentName,
        amountPaid: sale.amountPaid.toString(),
        receiptNumber,
        methodLabel: PAYMENT_METHOD_LABELS[method] ?? method,
      });
    }

    revalidatePath("/sales/stationery");
    revalidatePath("/sales/stationery/stock");
    return ok({ saleId: sale.id, receiptNumber });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function getStationeryReceiptPdfAction(
  saleId: string,
): Promise<ActionResult<{ filename: string; base64: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.SALES_RECORD);
    const sale = await prisma.stationerySale.findFirst({
      where: { id: saleId, schoolId: tenant.schoolId },
      include: {
        lines: true,
        receipt: true,
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
      },
    });
    if (!sale || !sale.receipt) {
      return fail("NOT_FOUND", "Sale or receipt not found.");
    }

    const school = await loadSchoolBrand(tenant.schoolId);
    const payerName = sale.student
      ? `${sale.student.firstName} ${sale.student.lastName}`
      : "Walk-in customer";
    const buffer = await buildPaymentReceiptPdf({
      school,
      title: "Stationery receipt",
      receiptNumber: sale.receipt.receiptNumber,
      receiptType: "STN",
      payerName,
      payerDetail: sale.student
        ? `Admission # ${sale.student.admissionNumber}`
        : undefined,
      lineItems: sale.lines.map((l) => ({
        description: `${l.name} × ${l.quantity}`,
        amount: l.lineTotal.toFixed(2),
      })),
      amountPaid: sale.amountPaid.toFixed(2),
      methodLabel: PAYMENT_METHOD_LABELS[sale.method] ?? sale.method,
      invoiceTotal: sale.totalAmount.toFixed(2),
    });

    return ok({
      filename: `${sale.receipt.receiptNumber}.pdf`,
      base64: buffer.toString("base64"),
    });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

/** Unused helper kept for route handlers that want Response directly */
export async function stationeryReceiptResponse(saleId: string, schoolId: string) {
  const sale = await prisma.stationerySale.findFirst({
    where: { id: saleId, schoolId },
    include: { lines: true, receipt: true, student: true },
  });
  if (!sale?.receipt) return null;
  const school = await loadSchoolBrand(schoolId);
  const buffer = await buildPaymentReceiptPdf({
    school,
    title: "Stationery receipt",
    receiptNumber: sale.receipt.receiptNumber,
    receiptType: "STN",
    payerName: sale.student
      ? `${sale.student.firstName} ${sale.student.lastName}`
      : "Walk-in customer",
    lineItems: sale.lines.map((l) => ({
      description: `${l.name} × ${l.quantity}`,
      amount: l.lineTotal.toFixed(2),
    })),
    amountPaid: sale.amountPaid.toFixed(2),
    methodLabel: PAYMENT_METHOD_LABELS[sale.method] ?? sale.method,
  });
  return pdfDownloadResponse(buffer, `${sale.receipt.receiptNumber}.pdf`);
}
