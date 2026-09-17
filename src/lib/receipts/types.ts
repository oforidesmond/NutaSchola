import type { PaymentMethod } from "@prisma/client";
import type { ReportSchoolBrand } from "@/lib/reports/types";

export type ThermalPaperWidth = "58mm" | "80mm";

/** Payer shown on invoice payment receipts (applicant or enrolled student). */
export type ReceiptPayer = {
  fullName: string;
  classLevelName: string;
};

/** @deprecated Prefer ReceiptPayer */
export type ReceiptApplicant = ReceiptPayer;

export type ReceiptPayment = {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string | null;
  receiptNumber?: string | null;
};

export type InvoicePaymentReceiptData = {
  school: ReportSchoolBrand;
  title: string;
  payerLabel: string;
  classLabel: string;
  payer: ReceiptPayer;
  invoiceNumber: string;
  /** Persisted ADM-/FEE-###### when available; falls back to invoice-Pn for legacy payments */
  receiptNumber: string;
  /** 1-based chronological payment index on this invoice */
  paymentIndex: number;
  payment: ReceiptPayment;
  invoiceTotal: string;
  /** Cumulative paid through this payment (inclusive) */
  paidToDate: string;
  balanceOutstanding: string;
};

/** @deprecated Prefer InvoicePaymentReceiptData */
export type AdmissionFeeReceiptData = InvoicePaymentReceiptData;

export type StationerySaleLineReceipt = {
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type StationerySaleReceiptData = {
  school: ReportSchoolBrand;
  receiptNumber: string;
  soldAt: string;
  payerName: string;
  method: PaymentMethod;
  lines: StationerySaleLineReceipt[];
  totalAmount: string;
  amountPaid: string;
};
