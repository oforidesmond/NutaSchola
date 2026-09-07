"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { sendBulkAdmissionFeeArrearsRemindersAction } from "./actions";

export function BulkArrearsRemindButton({
  outstandingLabel,
  disabled,
}: {
  outstandingLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await sendBulkAdmissionFeeArrearsRemindersAction();
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const { sent, skipped, failed } = result.data;
    setMessage(
      `Arrears reminders: ${sent} sent` +
        (skipped ? `, ${skipped} skipped` : "") +
        (failed ? `, ${failed} failed` : "") +
        ".",
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
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
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="self-start"
      >
        Remind all with outstanding fees
      </Button>
      <ConfirmDialog
        open={open}
        title="Send bulk arrears reminders?"
        consequence={`This texts each unique primary guardian with an outstanding admission fee (currently ${outstandingLabel}). Duplicates by phone are sent once.`}
        confirmLabel="Yes, send reminders"
        loading={loading}
        onConfirm={() => void onConfirm()}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
      />
    </div>
  );
}
