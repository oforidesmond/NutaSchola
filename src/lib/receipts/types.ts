import type { PaymentMethod } from "@prisma/client";
import type { ReportSchoolBrand } from "@/lib/reports/types";

export type ThermalPaperWidth = "58mm" | "80mm";

export type ReceiptApplicant = {
  fullName: string;
  classLevelAppliedName: string;
};

export type ReceiptPayment = {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string | null;
};

export type AdmissionFeeReceiptData = {
  school: ReportSchoolBrand;
  applicant: ReceiptApplicant;
  invoiceNumber: string;
  /** 1-based chronological payment index on this invoice */
  paymentIndex: number;
  payment: ReceiptPayment;
  invoiceTotal: string;
  /** Cumulative paid through this payment (inclusive) */
  paidToDate: string;
  balanceOutstanding: string;
};
