import type { InvoiceStatus, PaymentMethod, Prisma, ReceiptPrefix } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { allocateReceipt } from "@/lib/fees/receipts";

type Tx = Prisma.TransactionClient;

function toAmount(value: { toString(): string } | string | number): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function assertPaymentWithinBalance(input: {
  totalAmount: { toString(): string } | string | number;
  amountPaid: { toString(): string } | string | number;
  paymentAmount: number;
}): { balance: number; amount: number; newPaid: number; newStatus: InvoiceStatus } {
  const total = toAmount(input.totalAmount);
  const alreadyPaid = toAmount(input.amountPaid);
  const balance = Number((total - alreadyPaid).toFixed(2));
  const amount = Number(input.paymentAmount.toFixed(2));

  if (balance <= 0) {
    throw new AppError("ALREADY_PAID", "This invoice is already fully paid.", {
      status: 400,
    });
  }
  if (amount > balance) {
    throw new AppError(
      "AMOUNT_EXCEEDS_BALANCE",
      `Amount exceeds the outstanding balance of GHS ${balance.toFixed(2)}.`,
      { status: 400 },
    );
  }

  const newPaid = Number((alreadyPaid + amount).toFixed(2));
  const newStatus: InvoiceStatus = newPaid >= total ? "PAID" : "PARTIALLY_PAID";
  return { balance, amount, newPaid, newStatus };
}

/**
 * Record a successful payment against an invoice, allocate a typed receipt,
 * and update invoice paid amount / status. Must run inside a transaction.
 */
export async function recordInvoicePayment(
  tx: Tx,
  input: {
    schoolId: string;
    invoiceId: string;
    totalAmount: { toString(): string } | string | number;
    amountPaid: { toString(): string } | string | number;
    paymentAmount: number;
    method: PaymentMethod;
    reference?: string | null;
    receiptPrefix: ReceiptPrefix;
  },
): Promise<{
  paymentId: string;
  receiptId: string;
  receiptNumber: string;
  newPaid: number;
  newStatus: InvoiceStatus;
  amount: number;
}> {
  const { amount, newPaid, newStatus } = assertPaymentWithinBalance({
    totalAmount: input.totalAmount,
    amountPaid: input.amountPaid,
    paymentAmount: input.paymentAmount,
  });

  const receipt = await allocateReceipt(tx, input.schoolId, input.receiptPrefix);

  const payment = await tx.payment.create({
    data: {
      schoolId: input.schoolId,
      invoiceId: input.invoiceId,
      amount: amount.toFixed(2),
      method: input.method,
      status: "SUCCESSFUL",
      reference: input.reference?.trim() || null,
      paidAt: new Date(),
      receiptId: receipt.id,
    },
  });

  await tx.invoice.update({
    where: { id: input.invoiceId },
    data: { amountPaid: newPaid.toFixed(2), status: newStatus },
  });

  return {
    paymentId: payment.id,
    receiptId: receipt.id,
    receiptNumber: receipt.receiptNumber,
    newPaid,
    newStatus,
    amount,
  };
}
