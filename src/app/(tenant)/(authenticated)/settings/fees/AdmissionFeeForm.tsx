"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { updateAdmissionFeeAction } from "./actions";

export function AdmissionFeeForm({
  feeItemId,
  itemName,
  amount,
  readOnly = false,
}: {
  feeItemId: string;
  itemName: string;
  amount: string;
  readOnly?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await updateAdmissionFeeAction(new FormData(event.currentTarget));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage(
      "Admission fee updated. New invoices will use this amount; existing invoices are unchanged.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="feeItemId" value={feeItemId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Fee item name"
          name="itemName"
          defaultValue={itemName}
          required
          disabled={readOnly}
        />
        <Input
          label="Amount (GHS)"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={amount}
          required
          disabled={readOnly}
          className="font-variant-numeric tabular-nums"
        />
      </div>
      <p className="text-[13px] text-[var(--gray-500)]">
        Changing this amount does not alter invoices already issued for applicants.
      </p>
      {message ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}
      {!readOnly ? (
        <Button type="submit" loading={loading} className="self-start">
          Save admission fee
        </Button>
      ) : null}
    </form>
  );
}
