import { formatGhs } from "@/lib/format/currency";

export type FeeAmounts = {
  totalAmount: { toString(): string } | string | number;
  amountPaid: { toString(): string } | string | number;
};

function toAmount(value: { toString(): string } | string | number): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function feeOutstanding(amounts: FeeAmounts): number {
  return toAmount(amounts.totalAmount) - toAmount(amounts.amountPaid);
}

/** Human-readable partial fee line, e.g. "Paid GHS 50.00 of GHS 150.00 — GHS 100.00 outstanding". */
export function formatFeePaymentSummary(amounts: FeeAmounts): string {
  const total = toAmount(amounts.totalAmount);
  const paid = toAmount(amounts.amountPaid);
  const outstanding = total - paid;

  if (paid <= 0) {
    return `${formatGhs(total.toFixed(2))} invoiced — nothing paid yet`;
  }

  if (outstanding <= 0) {
    return `Paid ${formatGhs(paid.toFixed(2))} of ${formatGhs(total.toFixed(2))} — fully paid`;
  }

  return `Paid ${formatGhs(paid.toFixed(2))} of ${formatGhs(total.toFixed(2))} — ${formatGhs(outstanding.toFixed(2))} outstanding`;
}
