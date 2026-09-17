import type { Prisma, ReceiptPrefix } from "@prisma/client";

type Tx = Prisma.TransactionClient;

function pad(seq: number, width = 6): string {
  return String(Math.max(seq, 0)).padStart(width, "0");
}

/**
 * Atomically increments SchoolSettings.receiptNextSeq and creates a Receipt.
 * One global sequence per school; prefix distinguishes ADM / FEE / STN.
 */
export async function allocateReceipt(
  tx: Tx,
  schoolId: string,
  prefix: ReceiptPrefix,
): Promise<{ id: string; receiptNumber: string; seq: number }> {
  const settings = await tx.schoolSettings.update({
    where: { schoolId },
    data: { receiptNextSeq: { increment: 1 } },
    select: { receiptNextSeq: true },
  });
  const seq = settings.receiptNextSeq - 1;
  const receiptNumber = `${prefix}-${pad(seq)}`;

  const receipt = await tx.receipt.create({
    data: {
      schoolId,
      prefix,
      seq,
      receiptNumber,
    },
  });

  return { id: receipt.id, receiptNumber: receipt.receiptNumber, seq: receipt.seq };
}
