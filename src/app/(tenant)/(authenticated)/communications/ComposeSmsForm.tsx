"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SmsCreditsAlertDialog } from "@/components/ui/SmsCreditsAlertDialog";
import { SMS_CREDITS_EXHAUSTED_CODE } from "@/lib/sms/credits";
import {
  composeGuardianSmsAction,
  searchGuardiansForSmsAction,
  type GuardianSmsSearchHit,
} from "./actions";

type ClassOption = { id: string; name: string };

type Audience = "all_primary" | "class" | "outstanding_fees" | "guardian" | "custom_phone";

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base";

function countPhoneTokens(raw: string): number {
  const seen = new Set<string>();
  for (const token of raw.split(/[,;\s]+/)) {
    const t = token.trim();
    if (!t) continue;
    seen.add(t);
  }
  return seen.size;
}

export function ComposeSmsForm({ classLevels }: { classLevels: ClassOption[] }) {
  const [audience, setAudience] = useState<Audience>("all_primary");
  const [body, setBody] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creditsAlertOpen, setCreditsAlertOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  const [guardianQuery, setGuardianQuery] = useState("");
  const [guardianResults, setGuardianResults] = useState<GuardianSmsSearchHit[]>([]);
  const [selectedGuardians, setSelectedGuardians] = useState<GuardianSmsSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchSeq = useRef(0);

  const charCount = body.length;
  const segments = useMemo(() => {
    if (charCount === 0) return 0;
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153);
  }, [charCount]);

  const customPhoneCount = useMemo(() => countPhoneTokens(customPhone), [customPhone]);
  const selectedGuardianIds = useMemo(
    () => new Set(selectedGuardians.map((g) => g.id)),
    [selectedGuardians],
  );

  useEffect(() => {
    if (audience !== "guardian") {
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
  }, [audience, guardianQuery]);

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  function onAudienceChange(next: Audience) {
    setAudience(next);
    setSelectedGuardians([]);
    setGuardianQuery("");
    setGuardianResults([]);
    setCustomPhone("");
    setResultsOpen(false);
  }

  function pickGuardian(hit: GuardianSmsSearchHit) {
    setSelectedGuardians((prev) => {
      if (prev.some((g) => g.id === hit.id)) return prev;
      return [...prev, hit];
    });
    setGuardianQuery("");
    setGuardianResults([]);
    setResultsOpen(false);
  }

  function removeGuardian(id: string) {
    setSelectedGuardians((prev) => prev.filter((g) => g.id !== id));
  }

  function clearGuardians() {
    setSelectedGuardians([]);
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
      if (result.error.code === SMS_CREDITS_EXHAUSTED_CODE) {
        setCreditsAlertOpen(true);
        return;
      }
      setError(result.error.message);
      if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
      return;
    }
    const label =
      audience === "custom_phone"
        ? result.data.recipientCount === 1
          ? "number"
          : "numbers"
        : audience === "guardian"
          ? result.data.recipientCount === 1
            ? "guardian"
            : "guardians"
          : "guardians";
    setMessage(
      `Sent to ${result.data.sent} of ${result.data.recipientCount} ${label}` +
        (result.data.failed ? ` (${result.data.failed} failed)` : "") +
        ".",
    );
    setBody("");
    if (audience === "custom_phone") setCustomPhone("");
    if (audience === "guardian") clearGuardians();
  }

  const confirmCopy =
    audience === "guardian"
      ? {
          title:
            selectedGuardians.length === 1
              ? "Send this SMS to this guardian?"
              : `Send this SMS to ${selectedGuardians.length} guardians?`,
          consequence:
            "This creates an announcement and texts the selected guardians. Only continue if the message is ready to go out.",
        }
      : audience === "custom_phone"
        ? {
            title:
              customPhoneCount === 1
                ? "Send this SMS to this number?"
                : `Send this SMS to ${customPhoneCount} numbers?`,
            consequence:
              "This creates an announcement and texts the phone numbers you entered. Only continue if the message is ready to go out.",
          }
        : {
            title: "Send this SMS to guardians?",
            consequence:
              "This creates an announcement and texts every matching guardian phone. Only continue if the message is ready to go out.",
          };

  const visibleResults = guardianResults.filter((hit) => !selectedGuardianIds.has(hit.id));

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
          <option value="outstanding_fees">Outstanding school fees</option>
          <option value="guardian">Select guardians</option>
          <option value="custom_phone">Custom phone numbers</option>
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
        <div className="flex flex-col gap-2">
          <div className="relative flex flex-col gap-2">
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium text-[var(--gray-800)]">Guardians</span>
              <input
                type="text"
                value={guardianQuery}
                onChange={(e) => {
                  setGuardianQuery(e.target.value);
                  setResultsOpen(true);
                }}
                onFocus={() => {
                  if (guardianResults.length > 0) setResultsOpen(true);
                }}
                onBlur={() => {
                  // Allow click on a result before closing.
                  window.setTimeout(() => setResultsOpen(false), 150);
                }}
                placeholder="Search by name or phone to add…"
                autoComplete="off"
                className={inputClass}
                aria-autocomplete="list"
                aria-expanded={resultsOpen}
              />
            </label>
            {resultsOpen && (searching || visibleResults.length > 0 || guardianQuery.trim()) ? (
              <ul
                role="listbox"
                className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] shadow-sm"
              >
                {searching ? (
                  <li className="px-3 py-2 text-[14px] text-[var(--gray-500)]">Searching…</li>
                ) : visibleResults.length === 0 ? (
                  <li className="px-3 py-2 text-[14px] text-[var(--gray-500)]">
                    {guardianResults.length > 0 && selectedGuardianIds.size > 0
                      ? "All matching guardians already selected."
                      : "No guardians found."}
                  </li>
                ) : (
                  visibleResults.map((hit) => (
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
          </div>
          {selectedGuardians.map((g) => (
            <input key={g.id} type="hidden" name="guardianIds" value={g.id} />
          ))}
          {selectedGuardians.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {selectedGuardians.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex max-w-full items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--gray-50)] px-3 py-1.5 text-[14px] text-[var(--gray-800)]"
                  >
                    <span className="truncate">
                      {g.firstName} {g.lastName} · {g.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGuardian(g.id)}
                      className="shrink-0 text-[14px] font-medium text-[var(--brand-700)] hover:underline"
                      aria-label={`Remove ${g.firstName} ${g.lastName}`}
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 text-[13px] text-[var(--gray-500)]">
                <span>
                  {selectedGuardians.length} guardian
                  {selectedGuardians.length === 1 ? "" : "s"} selected
                </span>
                <button
                  type="button"
                  onClick={clearGuardians}
                  className="font-medium text-[var(--brand-700)] hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : null}
          {fieldError("guardianIds") ? (
            <span className="text-[14px] text-[var(--error-700)]">{fieldError("guardianIds")}</span>
          ) : null}
        </div>
      ) : null}

      {audience === "custom_phone" ? (
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Phone numbers</span>
          <textarea
            name="customPhone"
            required
            rows={4}
            value={customPhone}
            onChange={(e) => setCustomPhone(e.target.value)}
            placeholder={"One per line, or separated by commas\ne.g. 054…, +233…"}
            className="rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-base"
          />
          <span className="text-[13px] text-[var(--gray-500)]">
            {customPhoneCount} number{customPhoneCount === 1 ? "" : "s"}
            {fieldError("customPhone") ? ` · ${fieldError("customPhone")}` : ""}
          </span>
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

      <SmsCreditsAlertDialog
        open={creditsAlertOpen}
        onClose={() => setCreditsAlertOpen(false)}
      />
    </form>
  );
}
