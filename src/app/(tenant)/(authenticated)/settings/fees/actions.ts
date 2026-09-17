"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";

const admissionSchema = z.object({
  feeItemId: z.string().min(1),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimal places"),
  itemName: z.string().min(1, "Item name is required").max(120),
});

export async function updateAdmissionFeeAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);

    const parsed = admissionSchema.safeParse({
      feeItemId: formData.get("feeItemId"),
      amount: formData.get("amount"),
      itemName: formData.get("itemName"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
    }

    const amount = new Decimal(parsed.data.amount);
    if (amount.lessThanOrEqualTo(0)) {
      return fail("VALIDATION_ERROR", "Amount must be greater than zero.", {
        amount: ["Amount must be greater than zero"],
      });
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: tenant.schoolId,
        feeType: "ADMISSION",
        items: { some: { id: parsed.data.feeItemId } },
      },
      include: { items: true },
    });

    if (!feeStructure) {
      return fail(
        "NOT_FOUND",
        "Admission fee structure not found for this school.",
      );
    }

    await prisma.feeItem.update({
      where: { id: parsed.data.feeItemId },
      data: {
        name: parsed.data.itemName.trim(),
        amount,
      },
    });

    revalidatePath("/settings/fees");
    revalidatePath("/admissions");
    return ok({ saved: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

const schoolFeeSchema = z.object({
  feeStructureId: z.string().min(1),
  feeItemId: z.string().min(1),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimal places"),
  itemName: z.string().min(1).max(120),
});

export async function updateSchoolFeeAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);

    const parsed = schoolFeeSchema.safeParse({
      feeStructureId: formData.get("feeStructureId"),
      feeItemId: formData.get("feeItemId"),
      amount: formData.get("amount"),
      itemName: formData.get("itemName"),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
    }

    const amount = new Decimal(parsed.data.amount);
    if (amount.lessThanOrEqualTo(0)) {
      return fail("VALIDATION_ERROR", "Amount must be greater than zero.", {
        amount: ["Amount must be greater than zero"],
      });
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        id: parsed.data.feeStructureId,
        schoolId: tenant.schoolId,
        feeType: "SCHOOL_FEES",
        items: { some: { id: parsed.data.feeItemId } },
      },
    });

    if (!feeStructure) {
      return fail("NOT_FOUND", "School fees structure not found.");
    }

    await prisma.feeItem.update({
      where: { id: parsed.data.feeItemId },
      data: {
        name: parsed.data.itemName.trim(),
        amount,
      },
    });

    revalidatePath("/settings/fees");
    return ok({ saved: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

const createSchoolFeeSchema = z.object({
  termId: z.string().min(1),
  classLevelId: z.string().optional(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimal places"),
});

/** Create a SCHOOL_FEES structure for term + optional class level when missing. */
export async function ensureSchoolFeeStructureAction(
  formData: FormData,
): Promise<ActionResult<{ feeStructureId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);
    const parsed = createSchoolFeeSchema.safeParse({
      termId: formData.get("termId"),
      classLevelId: formData.get("classLevelId") || undefined,
      amount: formData.get("amount") || "500.00",
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid school fee setup.");
    }

    const classLevelId = parsed.data.classLevelId || null;
    const existing = await prisma.feeStructure.findFirst({
      where: {
        schoolId: tenant.schoolId,
        feeType: "SCHOOL_FEES",
        termId: parsed.data.termId,
        classLevelId,
      },
    });
    if (existing) {
      return ok({ feeStructureId: existing.id });
    }

    const term = await prisma.term.findFirst({
      where: { id: parsed.data.termId, schoolId: tenant.schoolId },
    });
    if (!term) return fail("NOT_FOUND", "Term not found.");

    let levelName = "All levels";
    if (classLevelId) {
      const level = await prisma.classLevel.findFirst({
        where: { id: classLevelId, schoolId: tenant.schoolId },
      });
      if (!level) return fail("NOT_FOUND", "Class level not found.");
      levelName = level.name;
    }

    const created = await prisma.feeStructure.create({
      data: {
        schoolId: tenant.schoolId,
        name: `School Fees — ${term.name} — ${levelName}`,
        feeType: "SCHOOL_FEES",
        termId: term.id,
        classLevelId,
        items: {
          create: [
            {
              name: "Tuition",
              amount: new Decimal(parsed.data.amount),
            },
          ],
        },
      },
    });

    revalidatePath("/settings/fees");
    return ok({ feeStructureId: created.id });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}
