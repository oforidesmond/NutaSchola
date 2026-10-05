"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Gender } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { AppError, fail, ok, toActionError, type ActionResult } from "@/lib/errors";

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

const profileSchema = z.object({
  studentId: z.string().min(1),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.nativeEnum(Gender),
  nationality: z.string().optional(),
  homeAddress: z.string().optional(),
  classLevelId: z.string().optional(),
  sectionId: z.string().optional(),
});

export async function updateStudentProfileAction(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const parsed = profileSchema.safeParse({
      studentId: formData.get("studentId"),
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName") || undefined,
      lastName: formData.get("lastName"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender: formData.get("gender"),
      nationality: formData.get("nationality") || undefined,
      homeAddress: formData.get("homeAddress") || undefined,
      classLevelId: formData.get("classLevelId") || undefined,
      sectionId: formData.get("sectionId") || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        schoolId: tenant.schoolId,
        deletedAt: null,
      },
    });
    if (!student) return fail("NOT_FOUND", "Student not found.");

    let classLevelId = student.currentClassLevelId;
    let sectionId = student.currentSectionId;

    if (parsed.data.classLevelId) {
      const level = await prisma.classLevel.findFirst({
        where: { id: parsed.data.classLevelId, schoolId: tenant.schoolId },
      });
      if (!level) return fail("NOT_FOUND", "Class level not found.");
      classLevelId = level.id;

      if (parsed.data.sectionId) {
        const section = await prisma.section.findFirst({
          where: {
            id: parsed.data.sectionId,
            schoolId: tenant.schoolId,
            classLevelId: level.id,
          },
        });
        if (!section) return fail("NOT_FOUND", "Section not found for this class.");
        sectionId = section.id;
      } else {
        sectionId = null;
      }
    }

    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: student.id },
        data: {
          firstName: parsed.data.firstName.trim(),
          middleName: parsed.data.middleName?.trim() || null,
          lastName: parsed.data.lastName.trim(),
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          gender: parsed.data.gender,
          nationality: parsed.data.nationality?.trim() || null,
          homeAddress: parsed.data.homeAddress?.trim() || null,
          currentClassLevelId: classLevelId,
          currentSectionId: sectionId,
        },
      });

      if (currentYear && classLevelId) {
        const enrollment = await tx.enrollment.findFirst({
          where: {
            studentId: student.id,
            academicYearId: currentYear.id,
            schoolId: tenant.schoolId,
          },
        });
        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: {
              classLevelId,
              sectionId,
            },
          });
        } else {
          await tx.enrollment.create({
            data: {
              schoolId: tenant.schoolId,
              studentId: student.id,
              academicYearId: currentYear.id,
              classLevelId,
              sectionId,
              status: "ACTIVE",
            },
          });
        }
      }
    });

    revalidatePath(`/students/${student.id}`);
    revalidatePath(`/students/${student.id}/fees`);
    revalidatePath("/students");
    return ok({ saved: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function deactivateStudentAction(
  studentId: string,
): Promise<ActionResult<{ deactivated: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: tenant.schoolId, deletedAt: null },
    });
    if (!student) return fail("NOT_FOUND", "Student not found.");

    await prisma.student.update({
      where: { id: student.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    revalidatePath(`/students/${student.id}`);
    revalidatePath(`/students/${student.id}/fees`);
    revalidatePath("/students");
    return ok({ deactivated: true });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

export async function reactivateStudentAction(
  studentId: string,
): Promise<ActionResult<{ activated: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_UPDATE);
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: tenant.schoolId },
    });
    if (!student) return fail("NOT_FOUND", "Student not found.");

    await prisma.student.update({
      where: { id: student.id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    revalidatePath(`/students/${student.id}`);
    revalidatePath(`/students/${student.id}/fees`);
    revalidatePath("/students");
    return ok({ activated: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.fieldErrors);
    }
    return fail(...toFailArgs(error));
  }
}
