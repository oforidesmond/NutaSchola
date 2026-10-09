"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { generateSchoolFeesInvoice } from "@/lib/fees";

function toFailArgs(error: unknown): [string, string] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message];
}

/**
 * Create current-term school-fees invoices for active students who do not have one yet.
 */
export async function generateMissingSchoolFeesInvoicesAction(): Promise<
  ActionResult<{ generated: number; failed: number; skipped: number }>
> {
  try {
    const { tenant } = await requireAction(ACTIONS.FEES_MANAGE);

    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
      select: { id: true },
    });
    if (!currentTerm) {
      return fail("NOT_FOUND", "No current term is set. Set a current term under Academic settings.");
    }

    const students = await prisma.student.findMany({
      where: { schoolId: tenant.schoolId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (students.length === 0) {
      return ok({ generated: 0, failed: 0, skipped: 0 });
    }

    const studentIds = students.map((s) => s.id);
    const existing = await prisma.invoice.findMany({
      where: {
        schoolId: tenant.schoolId,
        termId: currentTerm.id,
        studentId: { in: studentIds },
        feeStructure: { feeType: "SCHOOL_FEES" },
        status: { notIn: ["CANCELED", "VOID"] },
      },
      select: { studentId: true },
    });
    const haveInvoice = new Set(
      existing.map((inv) => inv.studentId).filter((id): id is string => Boolean(id)),
    );
    const missing = students.filter((s) => !haveInvoice.has(s.id));
    const skipped = students.length - missing.length;

    let generated = 0;
    let failed = 0;

    for (const student of missing) {
      try {
        await generateSchoolFeesInvoice(prisma, {
          schoolId: tenant.schoolId,
          studentId: student.id,
          termId: currentTerm.id,
        });
        generated += 1;
      } catch {
        failed += 1;
      }
    }

    revalidatePath("/students");
    return ok({ generated, failed, skipped });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
