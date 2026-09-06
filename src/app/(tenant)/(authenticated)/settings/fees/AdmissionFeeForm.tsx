"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { updateAdmissionFeeAction } from "./actions";

export function AdmissionFeeForm({
  feeItemId,
  itemName,
  amount,
}: {
  feeItemId: string;
  itemName: string;
  amount: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <form
      onSubmit={onSubmit}
      className="mt-4 flex max-w-md flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
    >
      <input type="hidden" name="feeItemId" value={feeItemId} />
      <Input label="Fee item name" name="itemName" defaultValue={itemName} required />
      <Input
        label="Amount (GHS)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={amount}
        required
        className="font-variant-numeric tabular-nums"
      />
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
      <Button type="submit" loading={loading} className="self-start">
        Save admission fee
      </Button>
    </form>
  );
}
