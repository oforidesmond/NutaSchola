"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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

const yearSchema = z.object({
  name: z.string().min(2, "Year name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export async function createAcademicYear(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const parsed = yearSchema.safeParse({
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const year = await prisma.academicYear.create({
      data: {
        schoolId: tenant.schoolId,
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        isCurrent: false,
      },
    });
    revalidatePath("/settings/academic");
    return ok({ id: year.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function setCurrentAcademicYear(
  yearId: string,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const year = await prisma.academicYear.findFirst({
      where: { id: yearId, schoolId: tenant.schoolId },
    });
    if (!year) return fail("NOT_FOUND", "Academic year not found.");

    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { schoolId: tenant.schoolId, isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({
        where: { id: yearId },
        data: { isCurrent: true },
      }),
    ]);
    revalidatePath("/settings/academic");
    revalidatePath("/settings/school");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const termSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().min(1, "Term name is required"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function createTerm(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const parsed = termSchema.safeParse({
      academicYearId: formData.get("academicYearId"),
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const year = await prisma.academicYear.findFirst({
      where: { id: parsed.data.academicYearId, schoolId: tenant.schoolId },
    });
    if (!year) return fail("NOT_FOUND", "Academic year not found.");

    const term = await prisma.term.create({
      data: {
        schoolId: tenant.schoolId,
        academicYearId: year.id,
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        isCurrent: false,
      },
    });
    revalidatePath("/settings/academic");
    return ok({ id: term.id });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function setCurrentTerm(
  termId: string,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const term = await prisma.term.findFirst({
      where: { id: termId, schoolId: tenant.schoolId },
    });
    if (!term) return fail("NOT_FOUND", "Term not found.");

    await prisma.$transaction([
      prisma.term.updateMany({
        where: { schoolId: tenant.schoolId, isCurrent: true },
        data: { isCurrent: false },
      }),
      prisma.term.update({
        where: { id: termId },
        data: { isCurrent: true },
      }),
    ]);
    revalidatePath("/settings/academic");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}
