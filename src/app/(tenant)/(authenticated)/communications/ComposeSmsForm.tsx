"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { composeGuardianSmsAction } from "./actions";

type ClassOption = { id: string; name: string };

export function ComposeSmsForm({ classLevels }: { classLevels: ClassOption[] }) {
  const [audience, setAudience] = useState<"all_primary" | "class">("all_primary");
  const [body, setBody] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  const charCount = body.length;
  const segments = useMemo(() => {
    if (charCount === 0) return 0;
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153);
  }, [charCount]);

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPendingForm(formData);
    setConfirmOpen(true);
  }

  async function onConfirm() {
    if (!pendingForm) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    setFieldErrors({});
    const result = await composeGuardianSmsAction(pendingForm);
    setLoading(false);
    setConfirmOpen(false);
    setPendingForm(null);
    if (!result.ok) {
      setError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }
    setMessage(
      `Sent to ${result.data.sent} of ${result.data.recipientCount} guardians` +
        (result.data.failed ? ` (${result.data.failed} failed)` : "") +
        ".",
    );
    setBody("");
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
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

      <Input
        label="Title"
        name="title"
        required
        maxLength={120}
        placeholder="e.g. School is closed on Friday"
        error={fieldError("title")}
      />

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium text-[var(--gray-800)]">Audience</span>
        <select
          name="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value as "all_primary" | "class")}
          className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
        >
          <option value="all_primary">All primary guardians</option>
          <option value="class">By class (enrolled students)</option>
        </select>
      </label>

      {audience === "class" ? (
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Class</span>
          <select
            name="classLevelId"
            required
            defaultValue=""
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          >
            <option value="" disabled>
              Select class…
            </option>
            {classLevels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldError("classLevelId") ? (
            <span className="text-[14px] text-[var(--error-700)]">{fieldError("classLevelId")}</span>
          ) : null}
        </label>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium text-[var(--gray-800)]">Message</span>
        <textarea
          name="body"
          required
          maxLength={640}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Short, clear message for guardians…"
          className="rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-base"
        />
        <span className="text-[13px] text-[var(--gray-500)]">
          {charCount}/640 characters · ~{segments} SMS segment{segments === 1 ? "" : "s"}
          {fieldError("body") ? ` · ${fieldError("body")}` : ""}
        </span>
      </label>

      <Button type="submit" loading={loading} className="self-start">
        Send SMS
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Send this SMS to guardians?"
        consequence="This creates an announcement and texts every matching guardian phone. Only continue if the message is ready to go out."
        confirmLabel="Yes, send now"
        loading={loading}
        onConfirm={() => void onConfirm()}
        onCancel={() => {
          if (!loading) {
            setConfirmOpen(false);
            setPendingForm(null);
          }
        }}
      />
    </form>
  );
}
