import { buildBrandedPdf } from "./pdf";
import type { ReportSchoolBrand } from "./types";

export type PaymentReceiptLineItem = {
  description: string;
  amount: string;
};

export type PaymentReceiptInput = {
  school: ReportSchoolBrand;
  /** Human title e.g. "Admission fee receipt", "School fees receipt" */
  title: string;
  receiptNumber: string;
  receiptType: "ADM" | "FEE" | "STN";
  payerName: string;
  payerDetail?: string;
  lineItems: PaymentReceiptLineItem[];
  amountPaid: string;
  methodLabel: string;
  invoiceTotal?: string;
  paidToDate?: string;
  balanceOutstanding?: string;
  reference?: string | null;
  paidAtLabel?: string;
};

/** Generic branded payment receipt PDF used by admission, school fees, and stationery. */
export async function buildPaymentReceiptPdf(
  input: PaymentReceiptInput,
): Promise<Buffer> {
  const lines: string[] = [
    `Receipt: ${input.receiptNumber}`,
    `Type: ${input.receiptType}`,
  ];
  if (input.paidAtLabel) lines.push(`Date: ${input.paidAtLabel}`);
  lines.push(`Payer: ${input.payerName}`);
  if (input.payerDetail) lines.push(input.payerDetail);
  lines.push(`Method: ${input.methodLabel}`);
  if (input.reference) lines.push(`Reference: ${input.reference}`);
  lines.push(`Amount paid: GHS ${input.amountPaid}`);
  if (input.invoiceTotal) lines.push(`Invoice total: GHS ${input.invoiceTotal}`);
  if (input.paidToDate) lines.push(`Paid to date: GHS ${input.paidToDate}`);
  if (input.balanceOutstanding != null) {
    lines.push(`Balance outstanding: GHS ${input.balanceOutstanding}`);
  }

  const itemLines = input.lineItems.map(
    (item) => `${item.description}: GHS ${item.amount}`,
  );

  return buildBrandedPdf({
    school: input.school,
    title: input.title,
    subtitle: input.receiptNumber,
    sections: [
      { heading: "Receipt details", lines },
      ...(itemLines.length
        ? [{ heading: "Line items", lines: itemLines }]
        : []),
    ],
  });
}
