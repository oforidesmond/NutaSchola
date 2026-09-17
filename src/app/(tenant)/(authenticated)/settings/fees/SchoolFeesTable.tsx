"use client";

import { FormEvent, useState } from "react";
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

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row.feeStructureId || !row.feeItemId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await updateSchoolFeeAction(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("Saved.");
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
      </td>
    </tr>
  );
}
