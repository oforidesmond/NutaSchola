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

export async function updateAcademicYear(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const id = String(formData.get("id") ?? "");
    const parsed = yearSchema.safeParse({
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const existing = await prisma.academicYear.findFirst({
      where: { id, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Academic year not found.");

    await prisma.academicYear.update({
      where: { id },
      data: {
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });
    revalidatePath("/settings/academic");
    revalidatePath("/settings/school");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function deleteAcademicYear(
  yearId: string,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const existing = await prisma.academicYear.findFirst({
      where: { id: yearId, schoolId: tenant.schoolId },
      include: {
        _count: {
          select: {
            enrollments: true,
            admissionApplications: true,
            invoices: true,
            terms: true,
          },
        },
      },
    });
    if (!existing) return fail("NOT_FOUND", "Academic year not found.");

    if (existing._count.enrollments > 0) {
      return fail(
        "CONFLICT",
        "Cannot delete this year because students are enrolled in it.",
      );
    }
    if (existing._count.admissionApplications > 0) {
      return fail(
        "CONFLICT",
        "Cannot delete this year because admission applications reference it.",
      );
    }
    if (existing._count.invoices > 0) {
      return fail(
        "CONFLICT",
        "Cannot delete this year because invoices reference it.",
      );
    }

    if (existing.isCurrent) {
      const otherYears = await prisma.academicYear.count({
        where: { schoolId: tenant.schoolId, id: { not: yearId } },
      });
      if (otherYears === 0) {
        return fail(
          "CONFLICT",
          "Cannot delete the only academic year. Create another year first.",
        );
      }
      return fail(
        "CONFLICT",
        "Cannot delete the current academic year. Make another year current first.",
      );
    }

    // Terms cascade; block if any term still has invoices/attendance/exams.
    const blockedTerms = await prisma.term.findMany({
      where: { academicYearId: yearId, schoolId: tenant.schoolId },
      include: {
        _count: {
          select: {
            invoices: true,
            attendanceRecords: true,
            exams: true,
            feeStructures: true,
          },
        },
      },
    });
    for (const term of blockedTerms) {
      if (
        term._count.invoices > 0 ||
        term._count.attendanceRecords > 0 ||
        term._count.exams > 0 ||
        term._count.feeStructures > 0
      ) {
        return fail(
          "CONFLICT",
          `Cannot delete this year because term “${term.name}” is still in use.`,
        );
      }
    }

    await prisma.academicYear.delete({ where: { id: yearId } });
    revalidatePath("/settings/academic");
    revalidatePath("/settings/school");
    return ok({ deleted: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function updateTerm(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const id = String(formData.get("id") ?? "");
    const parsed = z
      .object({
        name: z.string().min(1, "Term name is required"),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
      })
      .safeParse({
        name: formData.get("name"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
      });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrorsFromZod(parsed.error));
    }

    const existing = await prisma.term.findFirst({
      where: { id, schoolId: tenant.schoolId },
    });
    if (!existing) return fail("NOT_FOUND", "Term not found.");

    await prisma.term.update({
      where: { id },
      data: {
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });
    revalidatePath("/settings/academic");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function deleteTerm(
  termId: string,
): Promise<ActionResult<{ deleted: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_MANAGE);
    const existing = await prisma.term.findFirst({
      where: { id: termId, schoolId: tenant.schoolId },
      include: {
        _count: {
          select: {
            invoices: true,
            attendanceRecords: true,
            exams: true,
            feeStructures: true,
          },
        },
      },
    });
    if (!existing) return fail("NOT_FOUND", "Term not found.");

    if (existing._count.invoices > 0) {
      return fail("CONFLICT", "Cannot delete this term because invoices reference it.");
    }
    if (existing._count.attendanceRecords > 0) {
      return fail(
        "CONFLICT",
        "Cannot delete this term because attendance records reference it.",
      );
    }
    if (existing._count.exams > 0) {
      return fail("CONFLICT", "Cannot delete this term because exams reference it.");
    }
    if (existing._count.feeStructures > 0) {
      return fail(
        "CONFLICT",
        "Cannot delete this term because fee structures reference it.",
      );
    }

    if (existing.isCurrent) {
      const otherTerms = await prisma.term.count({
        where: { schoolId: tenant.schoolId, id: { not: termId } },
      });
      if (otherTerms === 0) {
        return fail(
          "CONFLICT",
          "Cannot delete the only current term. Create another term and make it current first.",
        );
      }
      return fail(
        "CONFLICT",
        "Cannot delete the current term. Make another term current first.",
      );
    }

    await prisma.term.delete({ where: { id: termId } });
    revalidatePath("/settings/academic");
    return ok({ deleted: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}
