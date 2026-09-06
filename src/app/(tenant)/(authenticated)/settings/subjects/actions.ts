"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";

const schema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
});

export async function createSubject(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const parsed = schema.safeParse({
      name: formData.get("name"),
      code: formData.get("code") || undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
    }

    const subject = await prisma.subject.create({
      data: {
        schoolId: tenant.schoolId,
        name: parsed.data.name,
        code: parsed.data.code || null,
      },
    });
    revalidatePath("/settings/subjects");
    return ok({ id: subject.id });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

export async function updateSubject(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const id = String(formData.get("id") ?? "");
    const parsed = schema.safeParse({
      name: formData.get("name"),
      code: formData.get("code") || undefined,
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.");
    }

    const existing = await prisma.subject.findFirst({
      where: { id, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Subject not found.");

    await prisma.subject.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code || null,
      },
    });
    revalidatePath("/settings/subjects");
    return ok({ saved: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

export async function deleteSubject(
  subjectId: string,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const existing = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Subject not found.");

    await prisma.subject.delete({ where: { id: subjectId } });
    revalidatePath("/settings/subjects");
    return ok({ deleted: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}
