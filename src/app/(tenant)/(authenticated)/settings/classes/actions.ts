"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { SchoolLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

const levelSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  levelType: z.nativeEnum(SchoolLevel),
  order: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
});

export async function createClassLevel(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const capacityRaw = formData.get("capacity");
    const parsed = levelSchema.safeParse({
      name: formData.get("name"),
      levelType: formData.get("levelType"),
      order: formData.get("order"),
      capacity: capacityRaw === "" || capacityRaw === null ? "" : capacityRaw,
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const level = await prisma.classLevel.create({
      data: {
        schoolId: tenant.schoolId,
        name: parsed.data.name,
        levelType: parsed.data.levelType,
        order: parsed.data.order,
        capacity:
          typeof parsed.data.capacity === "number" ? parsed.data.capacity : null,
      },
    });
    revalidatePath("/settings/classes");
    return ok({ id: level.id });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

export async function updateClassLevel(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const id = String(formData.get("id") ?? "");
    const capacityRaw = formData.get("capacity");
    const parsed = levelSchema.safeParse({
      name: formData.get("name"),
      levelType: formData.get("levelType"),
      order: formData.get("order"),
      capacity: capacityRaw === "" || capacityRaw === null ? "" : capacityRaw,
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const existing = await prisma.classLevel.findFirst({
      where: { id, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Class level not found.");

    await prisma.classLevel.update({
      where: { id },
      data: {
        name: parsed.data.name,
        levelType: parsed.data.levelType,
        order: parsed.data.order,
        capacity:
          typeof parsed.data.capacity === "number" ? parsed.data.capacity : null,
      },
    });
    revalidatePath("/settings/classes");
    return ok({ saved: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}

const sectionSchema = z.object({
  classLevelId: z.string().min(1),
  name: z.string().min(1, "Section name is required"),
});

export async function createSection(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const parsed = sectionSchema.safeParse({
      classLevelId: formData.get("classLevelId"),
      name: formData.get("name"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const level = await prisma.classLevel.findFirst({
      where: { id: parsed.data.classLevelId, schoolId: tenant.schoolId },
    });
    if (!level) return fail("NOT_FOUND", "Class level not found.");

    const section = await prisma.section.create({
      data: {
        schoolId: tenant.schoolId,
        classLevelId: level.id,
        name: parsed.data.name,
      },
    });
    revalidatePath("/settings/classes");
    return ok({ id: section.id });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}
