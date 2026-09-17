import type { PaymentMethod, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { allocateReceipt } from "@/lib/fees/receipts";

type Tx = Prisma.TransactionClient;

export type SaleLineInput = {
  itemId: string;
  quantity: number;
};

/**
 * Create a stationery sale: snapshot prices, decrement stock, allocate STN receipt.
 * Walk-in sales omit studentId.
 */
export async function createStationerySale(
  tx: Tx,
  input: {
    schoolId: string;
    recordedById: string;
    studentId?: string | null;
    method: PaymentMethod;
    lines: SaleLineInput[];
  },
) {
  if (!input.lines.length) {
    throw new AppError("VALIDATION_ERROR", "Add at least one line item.", {
      status: 400,
    });
  }

  if (input.studentId) {
    const student = await tx.student.findFirst({
      where: {
        id: input.studentId,
        schoolId: input.schoolId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!student) {
      throw new AppError("NOT_FOUND", "Student not found.", { status: 404 });
    }
  }

  const lineSnapshots: {
    itemId: string;
    name: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }[] = [];

  let total = 0;

  for (const line of input.lines) {
    if (line.quantity < 1) {
      throw new AppError("VALIDATION_ERROR", "Quantity must be at least 1.", {
        status: 400,
      });
    }
    const item = await tx.stationeryItem.findFirst({
      where: {
        id: line.itemId,
        schoolId: input.schoolId,
        isActive: true,
      },
    });
    if (!item) {
      throw new AppError("NOT_FOUND", "Stationery item not found or inactive.", {
        status: 404,
      });
    }
    if (item.stockQuantity < line.quantity) {
      throw new AppError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock for ${item.name} (available ${item.stockQuantity}).`,
        { status: 400 },
      );
    }

    const unit = Number(item.unitPrice.toString());
    const lineTotal = Number((unit * line.quantity).toFixed(2));
    total += lineTotal;

    lineSnapshots.push({
      itemId: item.id,
      name: item.name,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: line.quantity,
      lineTotal: lineTotal.toFixed(2),
    });

    await tx.stationeryItem.update({
      where: { id: item.id },
      data: { stockQuantity: { decrement: line.quantity } },
    });
  }

  const totalAmount = Number(total.toFixed(2));
  const receipt = await allocateReceipt(tx, input.schoolId, "STN");

  const sale = await tx.stationerySale.create({
    data: {
      schoolId: input.schoolId,
      studentId: input.studentId ?? null,
      totalAmount: totalAmount.toFixed(2),
      amountPaid: totalAmount.toFixed(2),
      method: input.method,
      recordedById: input.recordedById,
      receiptId: receipt.id,
      lines: {
        create: lineSnapshots.map((l) => ({
          itemId: l.itemId,
          name: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      },
    },
    include: {
      lines: true,
      receipt: true,
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      },
    },
  });

  return sale;
}
