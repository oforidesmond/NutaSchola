import type { PaymentMethod } from "@prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { AdmissionFeeReceiptData, ReceiptApplicant, ReceiptPayment } from "./types";

type InvoiceForReceipt = {
  invoiceNumber: string;
  totalAmount: string;
  payments: ReceiptPayment[];
};

/**
 * Build receipt data for one payment. Payments may be in any order;
 * chronological ascending order determines P{n} and running balances.
 */
export function buildAdmissionFeeReceiptData(options: {
  school: ReportSchoolBrand;
  applicant: ReceiptApplicant;
  invoice: InvoiceForReceipt;
  paymentId: string;
}): AdmissionFeeReceiptData | null {
  const { school, applicant, invoice, paymentId } = options;
  const chronological = [...invoice.payments].sort((a, b) => {
    const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });

  const index = chronological.findIndex((p) => p.id === paymentId);
  if (index < 0) return null;

  const payment = chronological[index];
  const paidToDate = chronological
    .slice(0, index + 1)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const invoiceTotal = Number(invoice.totalAmount);
  const balanceOutstanding = Math.max(0, Number((invoiceTotal - paidToDate).toFixed(2)));

  return {
    school,
    applicant,
    invoiceNumber: invoice.invoiceNumber,
    paymentIndex: index + 1,
    payment,
    invoiceTotal: invoice.totalAmount,
    paidToDate: paidToDate.toFixed(2),
    balanceOutstanding: balanceOutstanding.toFixed(2),
  };
}

export function paymentSelectLabel(payment: {
  amount: string;
  method: PaymentMethod;
  paidAt: string | null;
  reference: string | null;
}): string {
  const date = payment.paidAt ? formatDateAccra(payment.paidAt) : "No date";
  const ref = payment.reference ? ` · ${payment.reference}` : "";
  return `${PAYMENT_METHOD_LABELS[payment.method]} · ${date}${ref} · ${formatGhs(payment.amount)}`;
}
