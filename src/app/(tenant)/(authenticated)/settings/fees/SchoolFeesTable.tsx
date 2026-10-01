"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { formatGhs } from "@/lib/format/currency";
import { ensureSchoolFeeStructureAction, updateSchoolFeeAction } from "./actions";

export type SchoolFeeRow = {
  classLevelId: string | null;
  classLevelName: string;
  feeStructureId: string | null;
  feeItemId: string | null;
  itemName: string;
  amount: string;
};

export function SchoolFeesTable({
  termId,
  rows,
  readOnly,
}: {
  termId: string;
  rows: SchoolFeeRow[];
  readOnly: boolean;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-[var(--gray-100)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
            <th className="px-3 py-2 font-medium">Class level</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            {!readOnly ? <th className="px-3 py-2 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SchoolFeeRowEditor
              key={row.classLevelId ?? "all"}
              termId={termId}
              row={row}
              readOnly={readOnly}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchoolFeeRowEditor({
  termId,
  row,
  readOnly,
}: {
  termId: string;
  row: SchoolFeeRow;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingFormDataRef = useRef<FormData | null>(null);

  async function onCreate() {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("termId", termId);
    if (row.classLevelId) formData.set("classLevelId", row.classLevelId);
    formData.set("amount", "500.00");
    const result = await ensureSchoolFeeStructureAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row.feeStructureId || !row.feeItemId) return;
    setError(null);
    setMessage(null);
    pendingFormDataRef.current = new FormData(event.currentTarget);
    setConfirmOpen(true);
  }

  async function saveFee(applyToExistingInvoices: boolean) {
    const formData = pendingFormDataRef.current;
    if (!formData) return;
    formData.set("applyToExistingInvoices", applyToExistingInvoices ? "true" : "false");
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await updateSchoolFeeAction(formData);
    setLoading(false);
    setConfirmOpen(false);
    pendingFormDataRef.current = null;
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (applyToExistingInvoices) {
      const parts = [`Saved. Updated ${result.data.updated} invoice${result.data.updated === 1 ? "" : "s"}.`];
      if (result.data.skipped > 0) {
        parts.push(
          `Skipped ${result.data.skipped} (fully paid or amount already paid exceeds new total).`,
        );
      }
      setMessage(parts.join(" "));
    } else {
      setMessage("Saved template only. Existing student invoices were not changed.");
    }
    router.refresh();
  }

  if (!row.feeStructureId || !row.feeItemId) {
    return (
      <tr className="border-b border-[var(--gray-50)]">
        <td className="px-3 py-3 font-medium text-[var(--gray-900)]">{row.classLevelName}</td>
        <td className="px-3 py-3 text-[var(--gray-500)]" colSpan={readOnly ? 2 : 1}>
          Not configured
        </td>
        {!readOnly ? (
          <td className="px-3 py-3">
            <Button type="button" variant="secondary" loading={loading} onClick={() => void onCreate()}>
              Create (GHS 500)
            </Button>
            {error ? <p className="mt-1 text-[13px] text-[var(--error-700)]">{error}</p> : null}
          </td>
        ) : null}
      </tr>
    );
  }

  if (readOnly) {
    return (
      <tr className="border-b border-[var(--gray-50)]">
        <td className="px-3 py-3 font-medium text-[var(--gray-900)]">{row.classLevelName}</td>
        <td className="px-3 py-3 text-[var(--gray-700)]">{row.itemName}</td>
        <td className="px-3 py-3 font-variant-numeric tabular-nums">{formatGhs(row.amount)}</td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--gray-50)] align-top">
      <td className="px-3 py-3 font-medium text-[var(--gray-900)]">{row.classLevelName}</td>
      <td className="px-3 py-3" colSpan={3}>
        <form onSubmit={onSave} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="feeStructureId" value={row.feeStructureId} />
          <input type="hidden" name="feeItemId" value={row.feeItemId} />
          <Input label="Item name" name="itemName" defaultValue={row.itemName} required />
          <Input
            label="Amount (GHS)"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={row.amount}
            required
            className="font-variant-numeric tabular-nums"
          />
          <Button type="submit" loading={loading}>
            Save
          </Button>
          {message ? <span className="text-[13px] text-[var(--success-700)]">{message}</span> : null}
          {error ? <span className="text-[13px] text-[var(--error-700)]">{error}</span> : null}
        </form>
        <SaveFeeConfirmDialog
          open={confirmOpen}
          classLevelName={row.classLevelName}
          loading={loading}
          onUpdateInvoices={() => void saveFee(true)}
          onTemplateOnly={() => void saveFee(false)}
          onCancel={() => {
            if (!loading) {
              setConfirmOpen(false);
              pendingFormDataRef.current = null;
            }
          }}
        />
      </td>
    </tr>
  );
}

function SaveFeeConfirmDialog({
  open,
  classLevelName,
  loading,
  onUpdateInvoices,
  onTemplateOnly,
  onCancel,
}: {
  open: boolean;
  classLevelName: string;
  loading: boolean;
  onUpdateInvoices: () => void;
  onTemplateOnly: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%-2rem,28rem)] rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-0 shadow-[var(--shadow-xl)] backdrop:bg-black/40"
      onClose={onCancel}
      aria-labelledby={titleId}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-[20px] font-semibold text-[var(--gray-900)]">
          Save school fees for {classLevelName}?
        </h2>
        <p className="text-base text-[var(--gray-700)]">
          Update existing student invoices for this term and class that are not fully paid, or
          save the template only so current outstanding balances stay unchanged.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" loading={loading} onClick={onTemplateOnly}>
            Save template only
          </Button>
          <Button type="button" loading={loading} onClick={onUpdateInvoices}>
            Save and update invoices
          </Button>
        </div>
      </div>
    </dialog>
  );
}
