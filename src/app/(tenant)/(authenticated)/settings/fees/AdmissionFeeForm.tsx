"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatGhs } from "@/lib/format/currency";
import {
  addFeeItemAction,
  deleteFeeItemAction,
  ensureAdmissionFeeStructureAction,
  updateAdmissionFeeAction,
} from "./actions";

export type AdmissionFeeItem = {
  id: string;
  name: string;
  amount: string;
};

export function AdmissionFeeSetup({
  feeStructureId,
  structureName,
  items,
  readOnly = false,
}: {
  feeStructureId: string | null;
  structureName: string | null;
  items: AdmissionFeeItem[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onEnsure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await ensureAdmissionFeeStructureAction(
      new FormData(event.currentTarget),
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("Admission fee created.");
    router.refresh();
  }

  if (!feeStructureId || items.length === 0) {
    return (
      <div className="mt-4 max-w-3xl">
        {error ? (
          <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
            {message}
          </p>
        ) : null}
        <div className="rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--gray-50)] p-6">
          <p className="text-base font-medium text-[var(--gray-800)]">
            Admission fee not set up yet
          </p>
          <p className="mt-2 text-[15px] text-[var(--gray-600)]">
            Create a default admission fee to charge applicants.
          </p>
          {!readOnly ? (
            <form onSubmit={onEnsure} className="mt-4 flex flex-wrap items-end gap-3">
              <Input
                label="Initial amount (GHS)"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue="100.00"
                required
                className="font-variant-numeric tabular-nums"
              />
              <Button type="submit" loading={loading}>
                Create admission fee
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  const primaryItem = items[0]!;
  const pendingDelete = items.find((i) => i.id === pendingDeleteId) ?? null;

  return (
    <div className="mt-2 max-w-3xl rounded-[var(--radius-md)] border border-[var(--gray-100)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Admission fee</h2>
          <p className="mt-1 text-[15px] text-[var(--gray-600)]">{structureName}</p>
        </div>
        <p className="font-variant-numeric text-[22px] font-semibold tabular-nums text-[var(--gray-900)]">
          {formatGhs(primaryItem.amount)}
        </p>
      </div>

      {message ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 divide-y divide-[var(--gray-100)]">
        {items.map((item) => (
          <li key={item.id} className="py-4">
            <AdmissionFeeItemEditor
              item={item}
              readOnly={readOnly}
              canDelete={items.length > 1}
              onError={setError}
              onMessage={setMessage}
              onRequestDelete={() => setPendingDeleteId(item.id)}
            />
          </li>
        ))}
      </ul>

      {!readOnly ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--gray-100)] pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError(null);
            setMessage(null);
            const form = event.currentTarget;
            const fd = new FormData(form);
            fd.set("feeStructureId", feeStructureId);
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
          <Input label="New line name" name="itemName" placeholder="Assessment fee" required />
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

      {!readOnly ? (
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this fee line?"
          consequence={
            pendingDelete
              ? `“${pendingDelete.name}” will be removed from the admission fee template. Lines already used on invoices cannot be deleted.`
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

function AdmissionFeeItemEditor({
  item,
  readOnly,
  canDelete,
  onError,
  onMessage,
  onRequestDelete,
}: {
  item: AdmissionFeeItem;
  readOnly: boolean;
  canDelete: boolean;
  onError: (msg: string | null) => void;
  onMessage: (msg: string | null) => void;
  onRequestDelete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-[var(--gray-900)]">{item.name}</span>
        <span className="font-variant-numeric tabular-nums text-[var(--gray-700)]">
          {formatGhs(item.amount)}
        </span>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        onError(null);
        onMessage(null);
        const result = await updateAdmissionFeeAction(new FormData(event.currentTarget));
        setLoading(false);
        if (!result.ok) {
          onError(result.error.message);
          return;
        }
        onMessage(
          "Admission fee updated. New invoices will use this amount; existing invoices are unchanged.",
        );
      }}
    >
      <input type="hidden" name="feeItemId" value={item.id} />
      <Input label="Fee item name" name="itemName" defaultValue={item.name} required />
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
      {canDelete ? (
        <button
          type="button"
          className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--error-700)] hover:bg-[var(--error-50)]"
          aria-label={`Delete ${item.name}`}
          onClick={onRequestDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
