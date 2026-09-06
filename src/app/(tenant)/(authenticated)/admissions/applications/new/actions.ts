"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ApplicationSource, Gender, RelationshipType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { nextApplicationNumber } from "@/lib/admissions/numbering";
import { findOrCreateGuardian, linkGuardianToApplication } from "@/lib/admissions/guardians";
import { recordStageChange } from "@/lib/admissions/history";

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

const intakeSchema = z.object({
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
  academicYearId: z.string().min(1, "Academic year is required"),
  classLevelAppliedId: z.string().min(1, "Class applied for is required"),
  source: z.nativeEnum(ApplicationSource),
  guardianFirstName: z.string().min(1, "Guardian first name is required"),
  guardianLastName: z.string().min(1, "Guardian last name is required"),
  guardianPhone: z.string().min(6, "Guardian phone is required"),
  guardianAltPhone: z.string().optional(),
  guardianEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  guardianOccupation: z.string().optional(),
  guardianAddress: z.string().optional(),
  guardianRelationship: z.nativeEnum(RelationshipType),
});

export async function createApplication(
  formData: FormData,
): Promise<ActionResult<{ id: string; applicationNumber: string }>> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.ADMISSIONS_CREATE);

    const parsed = intakeSchema.safeParse({
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
      academicYearId: formData.get("academicYearId"),
      classLevelAppliedId: formData.get("classLevelAppliedId"),
      source: formData.get("source"),
      guardianFirstName: formData.get("guardianFirstName"),
      guardianLastName: formData.get("guardianLastName"),
      guardianPhone: formData.get("guardianPhone"),
      guardianAltPhone: formData.get("guardianAltPhone") || undefined,
      guardianEmail: formData.get("guardianEmail") || "",
      guardianOccupation: formData.get("guardianOccupation") || undefined,
      guardianAddress: formData.get("guardianAddress") || undefined,
      guardianRelationship: formData.get("guardianRelationship"),
    });

    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    const data = parsed.data;

    const [classLevel, academicYear] = await Promise.all([
      prisma.classLevel.findFirst({
        where: { id: data.classLevelAppliedId, schoolId: tenant.schoolId },
      }),
      prisma.academicYear.findFirst({
        where: { id: data.academicYearId, schoolId: tenant.schoolId },
      }),
    ]);

    if (!classLevel) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", {
        classLevelAppliedId: ["Selected class was not found."],
      });
    }
    if (!academicYear) {
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", {
        academicYearId: ["Selected academic year was not found."],
      });
    }

    const application = await prisma.$transaction(async (tx) => {
      const applicationNumber = await nextApplicationNumber(tx, tenant.schoolId);

      const created = await tx.admissionApplication.create({
        data: {
          schoolId: tenant.schoolId,
          applicationNumber,
          firstName: data.firstName.trim(),
          middleName: data.middleName?.trim() || null,
          lastName: data.lastName.trim(),
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          nationality: data.nationality?.trim() || "Ghanaian",
          religion: data.religion?.trim() || null,
          homeAddress: data.homeAddress?.trim() || null,
          previousSchoolName: data.previousSchoolName?.trim() || null,
          previousClassCompleted: data.previousClassCompleted?.trim() || null,
          academicYearId: data.academicYearId,
          classLevelAppliedId: data.classLevelAppliedId,
          source: data.source,
          stage: "APPLICATION_SUBMITTED",
          assignedOfficerId: user.id,
        },
      });

      const guardian = await findOrCreateGuardian(tx, tenant.schoolId, {
        firstName: data.guardianFirstName,
        lastName: data.guardianLastName,
        phone: data.guardianPhone,
        altPhone: data.guardianAltPhone,
        email: data.guardianEmail,
        occupation: data.guardianOccupation,
        address: data.guardianAddress,
      });

      await linkGuardianToApplication(tx, {
        applicationId: created.id,
        guardianId: guardian.id,
        relationship: data.guardianRelationship,
        isPrimaryContact: true,
      });

      await recordStageChange(tx, {
        applicationId: created.id,
        fromStage: null,
        toStage: "APPLICATION_SUBMITTED",
        changedById: user.id,
        note: "Application submitted at intake.",
      });

      return created;
    });

    revalidatePath("/admissions/applications");
    revalidatePath("/admissions");

    return ok({ id: application.id, applicationNumber: application.applicationNumber });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
