"use client";

import { FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatGhs } from "@/lib/format/currency";
import {
  addFeeItemAction,
  deleteFeeItemAction,
  ensureSchoolFeeStructureAction,
  updateSchoolFeeAction,
} from "./actions";

export type SchoolFeeItem = {
  id: string;
  name: string;
  amount: string;
};

export type SchoolFeeRow = {
  classLevelId: string | null;
  classLevelName: string;
  feeStructureId: string | null;
  items: SchoolFeeItem[];
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
    <div className="mt-4 flex flex-col gap-6">
      {rows.map((row) => (
        <SchoolFeeLevelEditor
          key={row.classLevelId ?? "all"}
          termId={termId}
          row={row}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function SchoolFeeLevelEditor({
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingFormDataRef = useRef<FormData | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingDelete = row.items.find((i) => i.id === pendingDeleteId) ?? null;

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
    if (!row.feeStructureId) return;
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
      const parts = [
        `Saved. Updated ${result.data.updated} invoice${result.data.updated === 1 ? "" : "s"}.`,
      ];
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

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--gray-50)]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold text-[var(--gray-900)]">
          {row.classLevelName}
        </h3>
        {!row.feeStructureId && !readOnly ? (
          <Button type="button" variant="secondary" loading={loading} onClick={() => void onCreate()}>
            Create (GHS 500)
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-[13px] text-[var(--error-700)]">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-2 text-[13px] text-[var(--success-700)]">{message}</p>
      ) : null}

      {!row.feeStructureId ? (
        <p className="mt-3 text-[15px] text-[var(--gray-500)]">Not configured</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--gray-100)]">
          {row.items.map((item) => (
            <li key={item.id} className="py-3">
              {readOnly ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--gray-800)]">{item.name}</span>
                  <span className="font-variant-numeric tabular-nums">
                    {formatGhs(item.amount)}
                  </span>
                </div>
              ) : (
                <form onSubmit={onSave} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="feeStructureId" value={row.feeStructureId!} />
                  <input type="hidden" name="feeItemId" value={item.id} />
                  <Input label="Item name" name="itemName" defaultValue={item.name} required />
                  <Input
                    label="Amount (GHS)"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={item.amount}
                    required
                    className="font-variant-numeric tabular-nums"
                  />
                  <Button type="submit" loading={loading}>
                    Save
                  </Button>
                  {row.items.length > 1 ? (
                    <button
                      type="button"
                      className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--error-700)] hover:bg-[var(--error-50)]"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setPendingDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {row.feeStructureId && !readOnly ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-[var(--gray-100)] pt-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError(null);
            setMessage(null);
            const form = event.currentTarget;
            const fd = new FormData(form);
            fd.set("feeStructureId", row.feeStructureId!);
            const result = await addFeeItemAction(fd);
            setLoading(false);
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            form.reset();
            setMessage("Fee line added.");
            router.refresh();
          }}
        >
          <Input label="New line name" name="itemName" placeholder="PTA dues" required />
          <Input
            label="Amount (GHS)"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue="50.00"
            required
            className="font-variant-numeric tabular-nums"
          />
          <Button type="submit" variant="secondary" loading={loading}>
            Add fee line
          </Button>
        </form>
      ) : null}

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

      {!readOnly ? (
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this fee line?"
          consequence={
            pendingDelete
              ? `“${pendingDelete.name}” will be removed from the template. Lines already used on invoices cannot be deleted.`
              : ""
          }
          confirmLabel="Delete fee line"
          destructive
          loading={pending}
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            if (!pendingDelete) return;
            startTransition(async () => {
              const result = await deleteFeeItemAction(pendingDelete.id);
              setPendingDeleteId(null);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setMessage("Fee line deleted.");
              router.refresh();
            });
          }}
        />
      ) : null}
    </div>
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
