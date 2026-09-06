"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { convertApplicationAction, deleteApplicationAction } from "./actions";

export function ConvertPanel({
  applicationId,
  canConvert,
  convertBlockedReason,
  alreadyConverted,
  convertedStudent,
  emphasized = false,
}: {
  applicationId: string;
  canConvert: boolean;
  convertBlockedReason: string | null;
  alreadyConverted: boolean;
  convertedStudent: { id: string; admissionNumber: string } | null;
  emphasized?: boolean;
}) {
  const router = useRouter();
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  async function onConvert() {
    setConvertLoading(true);
    setConvertError(null);
    const result = await convertApplicationAction(applicationId);
    setConvertLoading(false);
    if (!result.ok) {
      setConvertError(result.error.message);
      return;
    }
    router.refresh();
  }

  if (alreadyConverted && convertedStudent) {
    return (
      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Convert to student</h2>
        <div className="mt-3 flex flex-col gap-2">
          <StatusBadge label="Converted" tone="success" />
          <p className="text-[15px] text-[var(--gray-700)]">
            Enrolled as admission number{" "}
            <span className="font-variant-numeric tabular-nums font-semibold">
              {convertedStudent.admissionNumber}
            </span>
            .
          </p>
        </div>
      </section>
    );
  }

  if (!canConvert && !emphasized) {
    return (
      <section className="surface-flat px-5 py-4">
        <p className="text-[14px] text-[var(--gray-600)]">
          <span className="font-medium text-[var(--gray-800)]">Convert to student</span>
          {" — "}
          {convertBlockedReason ?? "Not eligible yet."}
        </p>
      </section>
    );
  }

  return (
    <section className={emphasized ? "surface-emphasis p-6" : "surface-raised p-6"}>
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Convert to student</h2>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-[15px] text-[var(--gray-600)]">
          Creates a Student record and current-year Enrollment, then locks the application at
          Enrolled. Requires Admitted stage with at least one payment on the admission fee invoice.
        </p>
        {!canConvert && convertBlockedReason ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--warning-50)] px-3 py-2 text-[15px] text-[#8a4a0c]">
            {convertBlockedReason}
          </p>
        ) : null}
        {convertError ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
            {convertError}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={!canConvert}
          loading={convertLoading}
          onClick={onConvert}
          className="self-start"
        >
          Convert to student
        </Button>
      </div>
    </section>
  );
}

export function DangerZone({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    const result = await deleteApplicationAction(applicationId);
    setDeleteLoading(false);
    setDeleteConfirmOpen(false);
    if (!result.ok) {
      setDeleteError(result.error.message);
      return;
    }
    router.push("/admissions/applications");
  }

  return (
    <details
      className="surface-danger group"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-[15px] font-medium text-[var(--gray-700)]">
        Danger zone
        <ChevronDown
          className="h-4 w-4 text-[var(--gray-500)] transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-[var(--error-50)] px-5 pb-5 pt-3">
        <p className="text-[15px] text-[var(--gray-600)]">
          Deleting removes this application from lists and search.
        </p>
        {deleteError ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
            {deleteError}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-4 self-start bg-[var(--error-600)] hover:bg-[var(--error-700)] active:bg-[var(--error-800)]"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          Delete application
        </Button>
      </div>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete this application?"
        consequence="This removes the application from every list and search screen. Guardians and any uploaded documents stay on file, but this record can no longer be found or edited from the admissions module."
        confirmLabel="Yes, delete"
        destructive
        loading={deleteLoading}
        onConfirm={() => void onDelete()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </details>
  );
}
