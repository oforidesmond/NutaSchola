"use client";

import { FormEvent, useState } from "react";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { ADMISSION_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatFeePaymentSummary, feeOutstanding } from "@/lib/admissions/fees";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
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
}: {
  applicationId: string;
  invoice: InvoiceView;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const balance = invoice ? Number(feeOutstanding(invoice).toFixed(2)) : 0;
  const paymentSummary = invoice ? formatFeePaymentSummary(invoice) : null;

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

  async function onRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const result = await recordAdmissionFeePaymentAction(new FormData(form));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    form.reset();
    setMessage("Payment recorded.");
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
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
          <Button type="button" loading={loading} onClick={onGenerateInvoice} className="self-start">
            Generate admission fee invoice
          </Button>
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

          {paymentSummary ? (
            <p className="rounded-[var(--radius-sm)] bg-[var(--brand-50)] px-3 py-2 text-[15px] font-medium text-[var(--brand-800)]">
              {paymentSummary}
            </p>
          ) : null}

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
              <p className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
                Payments
              </p>
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
            </div>
          ) : null}

          {balance > 0 ? (
            <form
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
          ) : (
            <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
              Fully paid.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
