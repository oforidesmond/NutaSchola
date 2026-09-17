import type { PaymentMethod } from "@prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type {
  InvoicePaymentReceiptData,
  ReceiptPayer,
  ReceiptPayment,
} from "./types";

type InvoiceForReceipt = {
  invoiceNumber: string;
  totalAmount: string;
  payments: ReceiptPayment[];
};

/**
 * Build receipt data for one payment. Payments may be in any order;
 * chronological ascending order determines P{n} and running balances.
 */
export function buildInvoicePaymentReceiptData(options: {
  school: ReportSchoolBrand;
  payer: ReceiptPayer;
  invoice: InvoiceForReceipt;
  paymentId: string;
  title?: string;
  payerLabel?: string;
  classLabel?: string;
}): InvoicePaymentReceiptData | null {
  const {
    school,
    payer,
    invoice,
    paymentId,
    title = "ADMISSION FEE RECEIPT",
    payerLabel = "Applicant",
    classLabel = "Class",
  } = options;
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
    title,
    payerLabel,
    classLabel,
    payer,
    invoiceNumber: invoice.invoiceNumber,
    paymentIndex: index + 1,
    receiptNumber:
      payment.receiptNumber ?? `${invoice.invoiceNumber}-P${index + 1}`,
    payment,
    invoiceTotal: invoice.totalAmount,
    paidToDate: paidToDate.toFixed(2),
    balanceOutstanding: balanceOutstanding.toFixed(2),
  };
}

/** @deprecated Prefer buildInvoicePaymentReceiptData */
export function buildAdmissionFeeReceiptData(options: {
  school: ReportSchoolBrand;
  applicant: ReceiptPayer;
  invoice: InvoiceForReceipt;
  paymentId: string;
}): InvoicePaymentReceiptData | null {
  return buildInvoicePaymentReceiptData({
    school: options.school,
    payer: options.applicant,
    invoice: options.invoice,
    paymentId: options.paymentId,
    title: "ADMISSION FEE RECEIPT",
    payerLabel: "Applicant",
    classLabel: "Class",
  });
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
