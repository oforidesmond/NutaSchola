"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";

const schema = z.object({
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
    const { tenant } = await requireAction(ACTIONS.SCHOOL_SETTINGS_UPDATE);

    const parsed = schema.safeParse({
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
        isAdmissionFee: true,
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
