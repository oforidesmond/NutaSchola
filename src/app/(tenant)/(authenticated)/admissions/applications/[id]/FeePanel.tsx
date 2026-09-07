"use client";

import { FormEvent, useRef, useState } from "react";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { Printer } from "lucide-react";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FeeProgress } from "@/components/ui/FeeProgress";
import { AdmissionFeeReceiptDialog } from "@/components/receipts/AdmissionFeeReceiptDialog";
import { ADMISSION_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { feeOutstanding } from "@/lib/admissions/fees";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { ReceiptApplicant } from "@/lib/receipts/types";
import { generateAdmissionFeeInvoiceAction, recordAdmissionFeePaymentAction } from "./actions";

export type InvoiceView = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  amountPaid: string;
  status: InvoiceStatus;
  items: { id: string; description: string; amount: string }[];
  payments: {
    id: string;
    amount: string;
    method: PaymentMethod;
    reference: string | null;
    paidAt: string | null;
  }[];
} | null;

const INVOICE_STATUS_TONE: Record<InvoiceStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "error",
  CANCELED: "neutral",
  VOID: "neutral",
};

export function FeePanel({
  applicationId,
  invoice,
  school,
  applicant,
  emphasized = false,
  readOnly = false,
}: {
  applicationId: string;
  invoice: InvoiceView;
  school: ReportSchoolBrand;
  applicant: ReceiptApplicant;
  emphasized?: boolean;
  readOnly?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<{
    amount: string;
    method: PaymentMethod;
    reference: string;
  } | null>(null);
  const paymentFormRef = useRef<HTMLFormElement>(null);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const balance = invoice ? Number(feeOutstanding(invoice).toFixed(2)) : 0;

  async function onGenerateInvoice() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await generateAdmissionFeeInvoiceAction(applicationId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("Admission fee invoice generated.");
  }

  function onRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = String(formData.get("amount") ?? "").trim();
    const method = String(formData.get("method") ?? "") as PaymentMethod;
    const reference = String(formData.get("reference") ?? "").trim();

    pendingFormDataRef.current = formData;
    setPendingSummary({ amount, method, reference });
    setConfirmOpen(true);
  }

  async function confirmRecordPayment() {
    const formData = pendingFormDataRef.current;
    if (!formData) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await recordAdmissionFeePaymentAction(formData);
    setLoading(false);
    setConfirmOpen(false);
    pendingFormDataRef.current = null;
    setPendingSummary(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    paymentFormRef.current?.reset();
    setMessage("Payment recorded.");
  }

  function cancelRecordPayment() {
    if (loading) return;
    setConfirmOpen(false);
    pendingFormDataRef.current = null;
    setPendingSummary(null);
  }

  const confirmConsequence = pendingSummary
    ? `You are about to record ${formatGhs(pendingSummary.amount)} via ${PAYMENT_METHOD_LABELS[pendingSummary.method]}${
        pendingSummary.reference ? ` (ref: ${pendingSummary.reference})` : ""
      }. This updates the invoice balance and cannot be undone from this screen.`
    : "You are about to record this admission fee payment. This updates the invoice balance and cannot be undone from this screen.";

  return (
    <section className={emphasized ? "surface-emphasis p-6" : "surface-raised p-6"}>
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Admission fee</h2>

      {message ? (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      {!invoice ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[15px] text-[var(--gray-600)]">
            No admission fee invoice has been generated for this application yet.
          </p>
          {!readOnly ? (
            <Button type="button" loading={loading} onClick={onGenerateInvoice} className="self-start">
              Generate admission fee invoice
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-medium text-[var(--gray-900)]">{invoice.invoiceNumber}</p>
            <StatusBadge
              label={invoice.status.replace(/_/g, " ")}
              tone={INVOICE_STATUS_TONE[invoice.status]}
            />
          </div>

          {invoice ? <FeeProgress amounts={invoice} className="mt-1" /> : null}

          <ul className="divide-y divide-[var(--gray-100)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
            {invoice.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 text-[15px]">
                <span className="text-[var(--gray-700)]">{item.description}</span>
                <span className="font-variant-numeric tabular-nums text-[var(--gray-900)]">
                  {formatGhs(item.amount)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-3 gap-3 text-[15px]">
            <div>
              <dt className="text-[13px] text-[var(--gray-500)]">Total</dt>
              <dd className="font-variant-numeric tabular-nums font-semibold text-[var(--gray-900)]">
                {formatGhs(invoice.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-[var(--gray-500)]">Paid</dt>
              <dd className="font-variant-numeric tabular-nums font-semibold text-[var(--success-700)]">
                {formatGhs(invoice.amountPaid)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-[var(--gray-500)]">Outstanding</dt>
              <dd className="font-variant-numeric tabular-nums font-semibold text-[var(--gray-900)]">
                {formatGhs(balance)}
              </dd>
            </div>
          </dl>

          {invoice.payments.length > 0 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
                  Payments
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReceiptOpen(true)}
                  className="min-h-9 px-3 text-[14px]"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  Print receipt
                </Button>
              </div>
              <ul className="mt-2 divide-y divide-[var(--gray-100)]">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-[15px]">
                    <span className="text-[var(--gray-700)]">
                      {PAYMENT_METHOD_LABELS[p.method]}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.paidAt ? ` · ${formatDateAccra(p.paidAt)}` : ""}
                    </span>
                    <span className="font-variant-numeric tabular-nums text-[var(--gray-900)]">
                      {formatGhs(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <AdmissionFeeReceiptDialog
                open={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                school={school}
                applicant={applicant}
                invoice={invoice}
              />
            </div>
          ) : null}

          {balance > 0 && !readOnly ? (
            <form
              ref={paymentFormRef}
              onSubmit={onRecordPayment}
              className="flex flex-col gap-4 border-t border-[var(--gray-100)] pt-4"
            >
              <input type="hidden" name="applicationId" value={applicationId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Amount (GHS)"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  defaultValue={balance.toFixed(2)}
                  required
                  className="font-variant-numeric tabular-nums"
                />
                <label className="flex flex-col gap-2">
                  <span className="text-[15px] font-medium text-[var(--gray-800)]">Method</span>
                  <select
                    name="method"
                    required
                    defaultValue="CASH"
                    className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
                  >
                    {ADMISSION_PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Input label="Reference (optional)" name="reference" placeholder="Receipt / MoMo ref." />
              <Button type="submit" loading={loading} className="self-start">
                Record payment
              </Button>
            </form>
          ) : balance > 0 && readOnly ? (
            <p className="text-[15px] text-[var(--gray-600)]">
              Outstanding balance: {formatGhs(balance)}. You can view fees but cannot record payments.
            </p>
          ) : (
            <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
              Fully paid.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Record this payment?"
        consequence={confirmConsequence}
        confirmLabel="Yes, record payment"
        loading={loading}
        onConfirm={() => void confirmRecordPayment()}
        onCancel={cancelRecordPayment}
      />
    </section>
  );
}
