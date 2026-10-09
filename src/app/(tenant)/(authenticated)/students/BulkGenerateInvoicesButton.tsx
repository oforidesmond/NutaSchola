"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { generateMissingSchoolFeesInvoicesAction } from "./actions";

export function BulkGenerateInvoicesButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await generateMissingSchoolFeesInvoicesAction();
    setLoading(false);
    setOpen(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const { generated, failed, skipped } = result.data;
    setMessage(
      `Generated ${generated}` +
        (skipped ? `, ${skipped} already had invoices` : "") +
        (failed ? `, ${failed} failed` : "") +
        ".",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
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
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="self-start">
        Generate missing invoices
      </Button>
      <ConfirmDialog
        open={open}
        title="Generate missing invoices?"
        consequence="This creates current-term school fee invoices for enrolled students who do not have one yet."
        confirmLabel="Yes, generate"
        loading={loading}
        onConfirm={() => void onConfirm()}
        onCancel={() => {
          if (!loading) setOpen(false);
        }}
      />
    </div>
  );
}
