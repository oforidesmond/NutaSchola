"use client";

import { FormEvent, useState } from "react";
import type { AdmissionStage } from "@prisma/client";
import { Button, Textarea } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { admissionStageLabel, MANUAL_STAGES } from "@/lib/admissions/stages";
import { changeApplicationStageAction } from "./actions";

const CONSEQUENCE_STAGES: Partial<Record<AdmissionStage, string>> = {
  REJECTED:
    "This marks the application as rejected. The primary guardian will be emailed (if enabled) and the reason you enter is saved on the record. You can still change the stage again later if this was a mistake.",
  WITHDRAWN:
    "This marks the application as withdrawn by the family. The primary guardian will be emailed (if enabled). You can still change the stage again later if this was a mistake.",
};

export function StageChangePanel({
  applicationId,
  currentStage,
  alreadyConverted,
  emphasized = false,
  readOnly = false,
}: {
  applicationId: string;
  currentStage: AdmissionStage;
  alreadyConverted: boolean;
  emphasized?: boolean;
  readOnly?: boolean;
}) {
  const [toStage, setToStage] = useState<AdmissionStage>(currentStage);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitChange() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("applicationId", applicationId);
    formData.set("toStage", toStage);
    formData.set("note", note);

    const result = await changeApplicationStageAction(formData);
    setLoading(false);
    setConfirmOpen(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage(`Stage updated to ${admissionStageLabel(toStage)}.`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (CONSEQUENCE_STAGES[toStage]) {
      setConfirmOpen(true);
      return;
    }
    void submitChange();
  }

  return (
    <section className={emphasized ? "surface-emphasis p-6" : "surface-raised p-6"}>
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Change stage</h2>

      {alreadyConverted ? (
        <p className="mt-3 text-[15px] text-[var(--gray-600)]">
          This applicant has been converted to a student, so the stage is locked at Enrolled.
        </p>
      ) : readOnly ? (
        <p className="mt-3 text-[15px] text-[var(--gray-600)]">
          Current stage:{" "}
          <span className="font-medium text-[var(--gray-900)]">
            {admissionStageLabel(currentStage)}
          </span>
          . You can view this application but cannot change stages.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">New stage</span>
            <select
              value={toStage}
              onChange={(e) => setToStage(e.target.value as AdmissionStage)}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {MANUAL_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {admissionStageLabel(stage)}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-[var(--gray-500)]">
              Enrolled is set automatically when you convert the applicant to a student.
            </span>
          </label>
          <Textarea
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              toStage === "REJECTED" ? "Reason for rejection (shared internally)" : "Add context for this change"
            }
          />
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
          <Button type="submit" loading={loading} disabled={toStage === currentStage} className="self-start">
            Update stage
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Move to ${admissionStageLabel(toStage)}?`}
        consequence={CONSEQUENCE_STAGES[toStage] ?? "Are you sure you want to make this change?"}
        confirmLabel="Yes, update stage"
        destructive
        loading={loading}
        onConfirm={() => void submitChange()}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
