"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Gender, RelationshipType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { nextApplicationNumber, nextAdmissionNumber } from "@/lib/admissions/numbering";
import { findOrCreateGuardian, linkGuardianToApplication } from "@/lib/admissions/guardians";
import { recordStageChange } from "@/lib/admissions/history";
import { convertApplicantToStudent } from "@/lib/admissions/convert";
import { generateSchoolFeesInvoice } from "@/lib/fees";
import {
  parseImportWorkbook,
  sameCalendarDay,
  type ParsedImportRow,
} from "@/lib/admissions/import";
import { rowsToCsv } from "@/lib/reports";

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}

export type ImportPreviewRow = ParsedImportRow;

export async function previewExistingStudentImportAction(
  formData: FormData,
): Promise<ActionResult<{ rows: ImportPreviewRow[] }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_CREATE);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("VALIDATION_ERROR", "Upload an .xlsx file.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const classLevels = await prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      select: { id: true, name: true },
    });

    const rows = await parseImportWorkbook(buffer, classLevels);

    // Duplicate detection: name + DOB + class level vs apps and students
    const apps = await prisma.admissionApplication.findMany({
      where: { schoolId: tenant.schoolId, deletedAt: null },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        classLevelAppliedId: true,
      },
    });
    const students = await prisma.student.findMany({
      where: { schoolId: tenant.schoolId, deletedAt: null },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        currentClassLevelId: true,
      },
    });

    for (const row of rows) {
      if (!row.dateOfBirth || !row.classLevelId) continue;
      const dob = new Date(row.dateOfBirth);
      const nameMatch = (fn: string, ln: string) =>
        fn.trim().toLowerCase() === row.firstName.toLowerCase() &&
        ln.trim().toLowerCase() === row.lastName.toLowerCase();

      const appDup = apps.find(
        (a) =>
          nameMatch(a.firstName, a.lastName) &&
          sameCalendarDay(a.dateOfBirth, dob) &&
          a.classLevelAppliedId === row.classLevelId,
      );
      const stuDup = students.find(
        (s) =>
          nameMatch(s.firstName, s.lastName) &&
          sameCalendarDay(s.dateOfBirth, dob) &&
          s.currentClassLevelId === row.classLevelId,
      );
      if (appDup || stuDup) {
        row.duplicate = true;
        row.duplicateReason = appDup
          ? "Matches an existing application (name + DOB + class)"
          : "Matches an existing student (name + DOB + class)";
      }
    }

    return ok({ rows });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}

const commitSchema = z.object({
  confirmDuplicates: z.boolean(),
  rowsJson: z.string().min(2),
});

export async function commitExistingStudentImportAction(
  formData: FormData,
): Promise<
  ActionResult<{
    created: number;
    converted: number;
    skipped: number;
    summaryCsv: string;
  }>
> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.ADMISSIONS_CREATE);
    const parsed = commitSchema.safeParse({
      confirmDuplicates: formData.get("confirmDuplicates") === "true",
      rowsJson: formData.get("rowsJson"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Invalid import payload.");
    }

    const rows = JSON.parse(parsed.data.rowsJson) as ImportPreviewRow[];
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
    });
    if (!academicYear) {
      return fail("NOT_FOUND", "No current academic year is set.");
    }

    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
      select: { id: true },
    });

    const summary: {
      row: number;
      name: string;
      status: string;
      detail: string;
      applicationNumber?: string;
      admissionNumber?: string;
    }[] = [];

    let created = 0;
    let converted = 0;
    let skipped = 0;

    for (const row of rows) {
      if (row.errors.length > 0) {
        skipped += 1;
        summary.push({
          row: row.rowNumber,
          name: row.studentName,
          status: "skipped",
          detail: row.errors.join("; "),
        });
        continue;
      }
      if (row.duplicate && !parsed.data.confirmDuplicates) {
        skipped += 1;
        summary.push({
          row: row.rowNumber,
          name: row.studentName,
          status: "skipped",
          detail: `Duplicate flagged — confirm to proceed (${row.duplicateReason})`,
        });
        continue;
      }
      if (!row.classLevelId) {
        skipped += 1;
        summary.push({
          row: row.rowNumber,
          name: row.studentName,
          status: "skipped",
          detail: "Missing class level",
        });
        continue;
      }

      try {
        const applicationId = await prisma.$transaction(async (tx) => {
          const applicationNumber = await nextApplicationNumber(tx, tenant.schoolId);
          const createdApp = await tx.admissionApplication.create({
            data: {
              schoolId: tenant.schoolId,
              applicationNumber,
              firstName: row.firstName,
              middleName: row.middleName,
              lastName: row.lastName,
              dateOfBirth: new Date(row.dateOfBirth),
              gender: row.gender as Gender,
              academicYearId: academicYear.id,
              classLevelAppliedId: row.classLevelId!,
              source: "OTHER",
              stage: "ADMITTED",
              decisionDate: new Date(),
              decisionNotes: "Bulk import — existing student",
              assignedOfficerId: user.id,
              admissionFeeWaived: row.admissionFeeWaived,
              admissionFeeWaivedReason: row.admissionFeeWaived
                ? row.waiverReason || "Existing student import"
                : null,
            },
          });

          await recordStageChange(tx, {
            applicationId: createdApp.id,
            fromStage: null,
            toStage: "ADMITTED",
            changedById: user.id,
            note: "Existing student bulk import — created at ADMITTED.",
          });

          const guardian = await findOrCreateGuardian(tx, tenant.schoolId, {
            firstName: row.guardianFirstName,
            lastName: row.guardianLastName,
            phone: row.guardianPhone,
            email: row.guardianEmail ?? undefined,
          });

          await linkGuardianToApplication(tx, {
            applicationId: createdApp.id,
            guardianId: guardian.id,
            relationship: RelationshipType.GUARDIAN,
            isPrimaryContact: true,
          });

          const admissionNumber = await nextAdmissionNumber(tx, tenant.schoolId);
          const student = await convertApplicantToStudent(tx, {
            schoolId: tenant.schoolId,
            applicationId: createdApp.id,
            changedById: user.id,
            admissionNumber,
          });

          return {
            applicationId: createdApp.id,
            applicationNumber: createdApp.applicationNumber,
            admissionNumber: student.admissionNumber,
            studentId: student.id,
          };
        });

        if (currentTerm) {
          try {
            await generateSchoolFeesInvoice(prisma, {
              schoolId: tenant.schoolId,
              studentId: applicationId.studentId,
              termId: currentTerm.id,
            });
          } catch {
            // invoice can be generated later
          }
        }

        created += 1;
        converted += 1;
        summary.push({
          row: row.rowNumber,
          name: row.studentName,
          status: "created",
          detail: "Application ADMITTED + converted",
          applicationNumber: applicationId.applicationNumber,
          admissionNumber: applicationId.admissionNumber,
        });
      } catch (error) {
        skipped += 1;
        summary.push({
          row: row.rowNumber,
          name: row.studentName,
          status: "error",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summaryCsv = rowsToCsv(
      [
        { key: "row", header: "Row" },
        { key: "name", header: "Name" },
        { key: "status", header: "Status" },
        { key: "detail", header: "Detail" },
        { key: "applicationNumber", header: "Application #" },
        { key: "admissionNumber", header: "Admission #" },
      ],
      summary,
    );

    revalidatePath("/admissions");
    revalidatePath("/admissions/applications");
    revalidatePath("/students");

    return ok({ created, converted, skipped, summaryCsv });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
