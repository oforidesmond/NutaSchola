"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteAcademicYear,
  deleteTerm,
  updateAcademicYear,
  updateTerm,
} from "./actions";

export type AcademicYearCard = {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  isCurrent: boolean;
  startLabel: string;
  endLabel: string;
  terms: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    startLabel: string;
    endLabel: string;
  }[];
};

type PendingDelete =
  | { kind: "year"; id: string; name: string }
  | { kind: "term"; id: string; name: string };

export function AcademicYearsList({
  years,
  readOnly = false,
}: {
  years: AcademicYearCard[];
  readOnly?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [pending, startTransition] = useTransition();

  if (years.length === 0) {
    return (
      <Card variant="flat" className="text-center">
        <p className="text-base font-medium text-[var(--gray-800)]">
          No academic years yet
        </p>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          {readOnly
            ? "Ask a school admin to set up academic years and terms."
            : "Create a year below to start organizing terms for admissions and enrollment."}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      {years.map((year) => {
        const isEditingYear = !readOnly && editingYearId === year.id;

        return (
          <Card key={year.id}>
            {isEditingYear ? (
              <form
                className="motion-enter flex flex-col gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError(null);
                  setSaving(true);
                  const result = await updateAcademicYear(
                    new FormData(event.currentTarget),
                  );
                  setSaving(false);
                  if (!result.ok) {
                    setError(result.error.message);
                    return;
                  }
                  setMessage("Academic year updated.");
                  setEditingYearId(null);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-[var(--gray-900)]">
                    Edit {year.name}
                  </p>
                  <button
                    type="button"
                    className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                    aria-label="Cancel editing year"
                    onClick={() => setEditingYearId(null)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <input type="hidden" name="id" value={year.id} />
                <div className="flex flex-wrap items-end gap-3">
                  <Input label="Name" name="name" defaultValue={year.name} required />
                  <Input
                    label="Start date"
                    name="startDate"
                    type="date"
                    defaultValue={year.startDate}
                    required
                  />
                  <Input
                    label="End date"
                    name="endDate"
                    type="date"
                    defaultValue={year.endDate}
                    required
                  />
                  <Button type="submit" loading={saving}>
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
                    {year.name}
                  </h2>
                  <p className="mt-1 text-[15px] text-[var(--gray-600)]">
                    {year.startLabel} – {year.endLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {year.isCurrent ? (
                    <StatusBadge label="Current year" tone="success" />
                  ) : null}
                  {!readOnly ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
                        aria-label={`Edit ${year.name}`}
                        onClick={() => setEditingYearId(year.id)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--error-700)] hover:bg-[var(--error-50)]"
                        aria-label={`Delete ${year.name}`}
                        onClick={() =>
                          setPendingDelete({
                            kind: "year",
                            id: year.id,
                            name: year.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <ul className="mt-4 divide-y divide-[var(--gray-100)]">
              {year.terms.map((term) => {
                const isEditingTerm = !readOnly && editingTermId === term.id;
                if (isEditingTerm) {
                  return (
                    <li key={term.id} className="py-3">
                      <form
                        className="flex flex-col gap-3"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          setError(null);
                          setSaving(true);
                          const result = await updateTerm(
                            new FormData(event.currentTarget),
                          );
                          setSaving(false);
                          if (!result.ok) {
                            setError(result.error.message);
                            return;
                          }
                          setMessage("Term updated.");
                          setEditingTermId(null);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[15px] font-semibold text-[var(--gray-900)]">
                            Edit {term.name}
                          </p>
                          <button
                            type="button"
                            className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                            aria-label="Cancel editing term"
                            onClick={() => setEditingTermId(null)}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <input type="hidden" name="id" value={term.id} />
                        <div className="flex flex-wrap items-end gap-3">
                          <Input
                            label="Term name"
                            name="name"
                            defaultValue={term.name}
                            required
                          />
                          <Input
                            label="Start date"
                            name="startDate"
                            type="date"
                            defaultValue={term.startDate}
                            required
                          />
                          <Input
                            label="End date"
                            name="endDate"
                            type="date"
                            defaultValue={term.endDate}
                            required
                          />
                          <Button type="submit" loading={saving}>
                            Save
                          </Button>
                        </div>
                      </form>
                    </li>
                  );
                }

                return (
                  <li
                    key={term.id}
                    className="interactive-row flex min-h-11 flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="text-[15px] font-medium text-[var(--gray-800)]">
                        {term.name}
                        {term.isCurrent ? (
                          <span className="ml-2">
                            <StatusBadge label="Current term" tone="info" />
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[13px] text-[var(--gray-500)]">
                        {term.startLabel} – {term.endLabel}
                      </p>
                    </div>
                    {!readOnly ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
                          aria-label={`Edit ${term.name}`}
                          onClick={() => setEditingTermId(term.id)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--error-700)] hover:bg-[var(--error-50)]"
                          aria-label={`Delete ${term.name}`}
                          onClick={() =>
                            setPendingDelete({
                              kind: "term",
                              id: term.id,
                              name: term.name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {year.terms.length === 0 ? (
                <li className="py-4 text-[15px] text-[var(--gray-500)]">
                  No terms in this year yet.
                  {readOnly ? null : " Add one below."}
                </li>
              ) : null}
            </ul>
          </Card>
        );
      })}

      {!readOnly ? (
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title={
            pendingDelete?.kind === "term"
              ? "Delete this term?"
              : "Delete this academic year?"
          }
          consequence={
            pendingDelete?.kind === "term"
              ? `“${pendingDelete.name}” will be removed. Terms in use by invoices, exams, attendance, or fees cannot be deleted.`
              : pendingDelete
                ? `“${pendingDelete.name}” and its unused terms will be removed. Years with enrollments or applications cannot be deleted.`
                : ""
          }
          confirmLabel={pendingDelete?.kind === "term" ? "Delete term" : "Delete year"}
          destructive
          loading={pending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return;
            startTransition(async () => {
              const result =
                pendingDelete.kind === "term"
                  ? await deleteTerm(pendingDelete.id)
                  : await deleteAcademicYear(pendingDelete.id);
              setPendingDelete(null);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              if (pendingDelete.kind === "year" && editingYearId === pendingDelete.id) {
                setEditingYearId(null);
              }
              if (pendingDelete.kind === "term" && editingTermId === pendingDelete.id) {
                setEditingTermId(null);
              }
              setMessage(
                pendingDelete.kind === "term" ? "Term deleted." : "Academic year deleted.",
              );
            });
          }}
        />
      ) : null}
    </div>
  );
}
