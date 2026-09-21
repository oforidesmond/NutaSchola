"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  composeGuardianSmsAction,
  searchGuardiansForSmsAction,
  type GuardianSmsSearchHit,
} from "./actions";

type ClassOption = { id: string; name: string };

type Audience = "all_primary" | "class" | "guardian" | "custom_phone";

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base";

export function ComposeSmsForm({ classLevels }: { classLevels: ClassOption[] }) {
  const [audience, setAudience] = useState<Audience>("all_primary");
  const [body, setBody] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardianResults, setGuardianResults] = useState<GuardianSmsSearchHit[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianSmsSearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchSeq = useRef(0);

  const charCount = body.length;
  const segments = useMemo(() => {
    if (charCount === 0) return 0;
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153);
  }, [charCount]);

  useEffect(() => {
    if (audience !== "guardian" || selectedGuardian) {
      setGuardianResults([]);
      setSearching(false);
      return;
    }

    const q = guardianQuery.trim();
    if (q.length < 1) {
      setGuardianResults([]);
      setSearching(false);
      return;
    }

    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await searchGuardiansForSmsAction(q);
        if (seq !== searchSeq.current) return;
        setSearching(false);
        if (!result.ok) {
          setGuardianResults([]);
          return;
        }
        setGuardianResults(result.data.results);
        setResultsOpen(true);
      })();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [audience, guardianQuery, selectedGuardian]);

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  function onAudienceChange(next: Audience) {
    setAudience(next);
    setSelectedGuardian(null);
    setGuardianQuery("");
    setGuardianResults([]);
    setCustomPhone("");
    setResultsOpen(false);
  }

  function pickGuardian(hit: GuardianSmsSearchHit) {
    setSelectedGuardian(hit);
    setGuardianQuery(`${hit.firstName} ${hit.lastName}`);
    setGuardianResults([]);
    setResultsOpen(false);
  }

  function clearGuardian() {
    setSelectedGuardian(null);
    setGuardianQuery("");
    setGuardianResults([]);
    setResultsOpen(false);
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
    const label =
      audience === "custom_phone"
        ? "recipient"
        : audience === "guardian"
          ? "guardian"
          : "guardians";
    setMessage(
      `Sent to ${result.data.sent} of ${result.data.recipientCount} ${label}` +
        (result.data.failed ? ` (${result.data.failed} failed)` : "") +
        ".",
    );
    setBody("");
    if (audience === "custom_phone") setCustomPhone("");
    if (audience === "guardian") clearGuardian();
  }

  const confirmCopy =
    audience === "guardian"
      ? {
          title: "Send this SMS to this guardian?",
          consequence:
            "This creates an announcement and texts the selected guardian. Only continue if the message is ready to go out.",
        }
      : audience === "custom_phone"
        ? {
            title: "Send this SMS to this number?",
            consequence:
              "This creates an announcement and texts the phone number you entered. Only continue if the message is ready to go out.",
          }
        : {
            title: "Send this SMS to guardians?",
            consequence:
              "This creates an announcement and texts every matching guardian phone. Only continue if the message is ready to go out.",
          };

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
          onChange={(e) => onAudienceChange(e.target.value as Audience)}
          className={inputClass}
        >
          <option value="all_primary">All primary guardians</option>
          <option value="class">By class (enrolled students)</option>
          <option value="guardian">One guardian</option>
          <option value="custom_phone">Custom phone number</option>
        </select>
      </label>

      {audience === "class" ? (
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Class</span>
          <select
            name="classLevelId"
            required
            defaultValue=""
            className={inputClass}
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

      {audience === "guardian" ? (
        <div className="relative flex flex-col gap-2">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Guardian</span>
            <input
              type="text"
              value={guardianQuery}
              onChange={(e) => {
                setGuardianQuery(e.target.value);
                if (selectedGuardian) setSelectedGuardian(null);
                setResultsOpen(true);
              }}
              onFocus={() => {
                if (!selectedGuardian && guardianResults.length > 0) setResultsOpen(true);
              }}
              onBlur={() => {
                // Allow click on a result before closing.
                window.setTimeout(() => setResultsOpen(false), 150);
              }}
              placeholder="Search by name or phone…"
              autoComplete="off"
              className={inputClass}
              aria-autocomplete="list"
              aria-expanded={resultsOpen}
            />
          </label>
          <input type="hidden" name="guardianId" value={selectedGuardian?.id ?? ""} />
          {selectedGuardian ? (
            <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--gray-50)] px-3 py-2 text-[14px] text-[var(--gray-800)]">
              <span>
                {selectedGuardian.firstName} {selectedGuardian.lastName} · {selectedGuardian.phone}
              </span>
              <button
                type="button"
                onClick={clearGuardian}
                className="text-[14px] font-medium text-[var(--brand-700)] hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}
          {resultsOpen && !selectedGuardian && (searching || guardianResults.length > 0 || guardianQuery.trim()) ? (
            <ul
              role="listbox"
              className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] shadow-sm"
            >
              {searching ? (
                <li className="px-3 py-2 text-[14px] text-[var(--gray-500)]">Searching…</li>
              ) : guardianResults.length === 0 ? (
                <li className="px-3 py-2 text-[14px] text-[var(--gray-500)]">No guardians found.</li>
              ) : (
                guardianResults.map((hit) => (
                  <li key={hit.id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[var(--gray-50)]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickGuardian(hit)}
                    >
                      <span className="text-[15px] text-[var(--gray-900)]">
                        {hit.firstName} {hit.lastName}
                      </span>
                      <span className="text-[13px] text-[var(--gray-500)]">{hit.phone}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
          {fieldError("guardianId") ? (
            <span className="text-[14px] text-[var(--error-700)]">{fieldError("guardianId")}</span>
          ) : null}
        </div>
      ) : null}

      {audience === "custom_phone" ? (
        <Input
          label="Phone number"
          name="customPhone"
          value={customPhone}
          onChange={(e) => setCustomPhone(e.target.value)}
          required
          placeholder="e.g. 054... or +233..."
          error={fieldError("customPhone")}
        />
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
          placeholder="Short, clear message for guardian…"
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
        title={confirmCopy.title}
        consequence={confirmCopy.consequence}
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
