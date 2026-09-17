import type { Invoice, Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { resolveSchoolFeeStructure } from "@/lib/fees/resolve";

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Generate (or return existing) school-fees invoice for a student + term.
 * Idempotent: one invoice per student per term.
 */
export async function generateSchoolFeesInvoice(
  db: Db,
  input: {
    schoolId: string;
    studentId: string;
    termId: string;
  },
): Promise<Invoice> {
  const existing = await db.invoice.findFirst({
    where: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      termId: input.termId,
      feeStructure: { feeType: "SCHOOL_FEES" },
      status: { notIn: ["CANCELED", "VOID"] },
    },
  });
  if (existing) return existing;

  const student = await db.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId, deletedAt: null },
    select: {
      id: true,
      admissionNumber: true,
      currentClassLevelId: true,
    },
  });
  if (!student) {
    throw new AppError("NOT_FOUND", "Student not found.", { status: 404 });
  }

  const term = await db.term.findFirst({
    where: { id: input.termId, schoolId: input.schoolId },
    select: { id: true, academicYearId: true, name: true },
  });
  if (!term) {
    throw new AppError("NOT_FOUND", "Term not found.", { status: 404 });
  }

  const feeStructure = await resolveSchoolFeeStructure(
    db,
    input.schoolId,
    input.termId,
    student.currentClassLevelId,
  );

  const totalAmount = feeStructure.items
    .reduce((sum, item) => sum + Number(item.amount.toString()), 0)
    .toFixed(2);

  const invoiceNumber = `FEE-${student.admissionNumber}-${term.name.replace(/\s+/g, "")}`;

  const clash = await db.invoice.findFirst({
    where: { schoolId: input.schoolId, invoiceNumber },
  });
  const finalNumber = clash
    ? `${invoiceNumber}-${Date.now().toString(36)}`
    : invoiceNumber;

  return db.invoice.create({
    data: {
      schoolId: input.schoolId,
      invoiceNumber: finalNumber,
      studentId: student.id,
      feeStructureId: feeStructure.id,
      academicYearId: term.academicYearId,
      termId: term.id,
      totalAmount,
      amountPaid: "0",
      status: "ISSUED",
      items: {
        create: feeStructure.items.map((item) => ({
          feeItemId: item.id,
          description: item.name,
          amount: item.amount,
        })),
      },
    },
  });
}
