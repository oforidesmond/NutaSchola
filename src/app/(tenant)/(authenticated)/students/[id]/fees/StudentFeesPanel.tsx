"use client";

import { FormEvent, useRef, useState } from "react";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { Printer } from "lucide-react";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { FeeProgress } from "@/components/ui/FeeProgress";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InvoicePaymentReceiptDialog } from "@/components/receipts/AdmissionFeeReceiptDialog";
import { ADMISSION_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { feeOutstanding } from "@/lib/admissions/fees";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { ReceiptPayer } from "@/lib/receipts/types";
import {
  generateStudentSchoolFeesInvoiceAction,
  recordSchoolFeePaymentAction,
} from "./actions";

export type StudentInvoiceView = {
  id: string;
  invoiceNumber: string;
  termId: string | null;
  termName: string | null;
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
    receiptNumber: string | null;
  }[];
};

export function StudentFeesPanel({
  studentId,
  currentTermId,
  invoices,
  canManage,
  school,
  payer,
}: {
  studentId: string;
  currentTermId: string | null;
  invoices: StudentInvoiceView[];
  canManage: boolean;
  school: ReportSchoolBrand;
  payer: ReceiptPayer;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<string | null>(null);
  const pendingFormDataRef = useRef<FormData | null>(null);

  const currentInvoice = currentTermId
    ? invoices.find((inv) => inv.termId === currentTermId)
    : invoices[0];

  const receiptInvoice = receiptInvoiceId
    ? invoices.find((inv) => inv.id === receiptInvoiceId)
    : null;

  async function onGenerate() {
    if (!currentTermId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await generateStudentSchoolFeesInvoiceAction(studentId, currentTermId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("School fees invoice generated for the current term.");
  }

  function onRecordPayment(event: FormEvent<HTMLFormElement>, invoiceId: string) {
    event.preventDefault();
    pendingFormDataRef.current = new FormData(event.currentTarget);
    setActiveInvoiceId(invoiceId);
    setConfirmOpen(true);
  }

  async function confirmPayment() {
    const formData = pendingFormDataRef.current;
    if (!formData) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await recordSchoolFeePaymentAction(formData);
    setLoading(false);
    setConfirmOpen(false);
    pendingFormDataRef.current = null;
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(`Payment recorded. Receipt ${result.data.receiptNumber}.`);
  }

  return (
    <section className="surface-raised p-6">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">School fees</h2>

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

      {!currentInvoice ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[15px] text-[var(--gray-600)]">
            No school fees invoice for the current term yet.
          </p>
          {canManage && currentTermId ? (
            <Button type="button" loading={loading} onClick={() => void onGenerate()} className="self-start">
              Generate current-term invoice
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-6">
        {invoices.map((invoice) => {
          const balance = Number(feeOutstanding(invoice).toFixed(2));
          return (
            <div
              key={invoice.id}
              className="rounded-[var(--radius-sm)] border border-[var(--gray-100)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--gray-900)]">
                    {invoice.termName ?? "Term"} · {invoice.invoiceNumber}
                  </p>
                </div>
                <StatusBadge label={invoice.status.replace(/_/g, " ")} tone="info" />
              </div>
              <FeeProgress amounts={invoice} className="mt-3" />
              <ul className="mt-3 divide-y divide-[var(--gray-100)]">
                {invoice.items.map((item) => (
                  <li key={item.id} className="flex justify-between py-2 text-[15px]">
                    <span>{item.description}</span>
                    <span className="font-variant-numeric tabular-nums">{formatGhs(item.amount)}</span>
                  </li>
                ))}
              </ul>
              {invoice.payments.length > 0 ? (
                <div className="mt-3 border-t border-[var(--gray-100)] pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
                      Payments
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setReceiptInvoiceId(invoice.id)}
                      className="min-h-9 px-3 text-[14px] inline-flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      Print receipt
                    </Button>
                  </div>
                  <ul className="mt-2 divide-y divide-[var(--gray-50)]">
                    {invoice.payments.map((p) => (
                      <li key={p.id} className="flex justify-between py-2 text-[14px] text-[var(--gray-700)]">
                        <span>
                          {p.receiptNumber ? `${p.receiptNumber} · ` : ""}
                          {PAYMENT_METHOD_LABELS[p.method]}
                          {p.paidAt ? ` · ${formatDateAccra(p.paidAt)}` : ""}
                        </span>
                        <span className="font-variant-numeric tabular-nums">{formatGhs(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {balance > 0 && canManage ? (
                <form
                  className="mt-4 flex flex-col gap-3 border-t border-[var(--gray-100)] pt-4"
                  onSubmit={(e) => onRecordPayment(e, invoice.id)}
                >
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Amount (GHS)"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={balance}
                      defaultValue={balance.toFixed(2)}
                      required
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
                  <Input label="Reference (optional)" name="reference" />
                  <Button type="submit" loading={loading && activeInvoiceId === invoice.id} className="self-start">
                    Record payment
                  </Button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      {receiptInvoice && receiptInvoice.payments.length > 0 ? (
        <InvoicePaymentReceiptDialog
          open
          onClose={() => setReceiptInvoiceId(null)}
          school={school}
          payer={payer}
          invoice={{
            invoiceNumber: receiptInvoice.invoiceNumber,
            totalAmount: receiptInvoice.totalAmount,
            payments: receiptInvoice.payments,
          }}
          title="SCHOOL FEE RECEIPT"
          payerLabel="Student"
          classLabel="Class"
        />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Record school fees payment?"
        consequence="This updates the invoice balance and issues a FEE- receipt. It cannot be undone from this screen."
        confirmLabel="Yes, record payment"
        loading={loading}
        onConfirm={() => void confirmPayment()}
        onCancel={() => {
          if (!loading) {
            setConfirmOpen(false);
            pendingFormDataRef.current = null;
          }
        }}
      />
    </section>
  );
}
