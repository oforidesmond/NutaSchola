"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/primitives";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Plain-language consequence — required (not a bare "Are you sure?"). */
  consequence: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  consequence,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
          {title}
        </h2>
        <p className="text-base text-[var(--gray-700)]">{consequence}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "primary" : "primary"}
            className={
              destructive
                ? "bg-[var(--error-600)] hover:bg-[var(--error-700)] active:bg-[var(--error-700)]"
                : ""
            }
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
