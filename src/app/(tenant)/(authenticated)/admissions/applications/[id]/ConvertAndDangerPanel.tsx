"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { convertApplicationAction, deleteApplicationAction } from "./actions";

export function ConvertAndDangerPanel({
  applicationId,
  canConvert,
  convertBlockedReason,
  alreadyConverted,
  convertedStudent,
}: {
  applicationId: string;
  canConvert: boolean;
  convertBlockedReason: string | null;
  alreadyConverted: boolean;
  convertedStudent: { id: string; admissionNumber: string } | null;
}) {
  const router = useRouter();
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Convert to student</h2>

        {alreadyConverted && convertedStudent ? (
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
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-[15px] text-[var(--gray-600)]">
              Creates a Student record and current-year Enrollment, then locks the application at
              Enrolled. Requires the applicant to be Admitted with at least one payment recorded
              against the admission fee invoice (full payment is not required).
            </p>
            {!canConvert && convertBlockedReason ? (
              <p className="rounded-[var(--radius-sm)] bg-[var(--warning-50)] px-3 py-2 text-[15px] text-[var(--warning-700)]">
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
        )}
      </section>

      {!alreadyConverted ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--error-500)] bg-[var(--error-50)] p-6">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Danger zone</h2>
          <p className="mt-2 text-[15px] text-[var(--gray-700)]">
            Deleting removes this application from lists and search. It can be restored by an
            administrator directly in the database if needed, but there is no undo in the product
            yet.
          </p>
          {deleteError ? (
            <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--white)] px-3 py-2 text-[15px] text-[var(--error-700)]">
              {deleteError}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-4 self-start bg-[var(--error-600)] hover:bg-[var(--error-700)] active:bg-[var(--error-700)]"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete application
          </Button>
        </section>
      ) : null}

      <Link
        href="/admissions/applications"
        className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
      >
        ← Back to applications
      </Link>

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
    </div>
  );
}
