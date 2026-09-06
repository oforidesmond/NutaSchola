"use client";

import { FormEvent, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui/primitives";
import {
  createAcademicYear,
  createTerm,
  setCurrentAcademicYear,
  setCurrentTerm,
} from "./actions";

type YearOption = {
  id: string;
  name: string;
  isCurrent: boolean;
  terms: { id: string; name: string; isCurrent: boolean }[];
};

export function AcademicForms({ years }: { years: YearOption[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onCreateYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const result = await createAcademicYear(new FormData(form));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    form.reset();
    setMessage("Academic year created.");
  }

  async function onCreateTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const result = await createTerm(new FormData(form));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    form.reset();
    setMessage("Term created.");
  }

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      {message ? (
        <p className="lg:col-span-2 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="lg:col-span-2 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onCreateYear}
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
      >
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">New academic year</h2>
        <Input label="Name" name="name" placeholder="2026/2027" required />
        <Input label="Start date" name="startDate" type="date" required />
        <Input label="End date" name="endDate" type="date" required />
        <Button type="submit">Create year</Button>
      </form>

      <form
        onSubmit={onCreateTerm}
        className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
      >
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">New term</h2>
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium text-[var(--gray-800)]">Academic year</span>
          <select
            name="academicYearId"
            required
            className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
          >
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Term name" name="name" placeholder="Term 1" required />
        <Input label="Start date" name="startDate" type="date" required />
        <Input label="End date" name="endDate" type="date" required />
        <Button type="submit">Create term</Button>
      </form>

      <section className="lg:col-span-2 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Set current</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Only one year and one term can be current at a time.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {years.map((year) => (
            <Button
              key={year.id}
              type="button"
              variant={year.isCurrent ? "primary" : "secondary"}
              disabled={pending || year.isCurrent}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await setCurrentAcademicYear(year.id);
                  if (!result.ok) setError(result.error.message);
                  else setMessage(`${year.name} is now the current year.`);
                })
              }
            >
              {year.isCurrent ? `Current: ${year.name}` : `Make ${year.name} current`}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {years.flatMap((year) =>
            year.terms.map((term) => (
              <Button
                key={term.id}
                type="button"
                variant={term.isCurrent ? "primary" : "secondary"}
                disabled={pending || term.isCurrent}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await setCurrentTerm(term.id);
                    if (!result.ok) setError(result.error.message);
                    else setMessage(`${term.name} (${year.name}) is now current.`);
                  })
                }
              >
                {term.isCurrent
                  ? `Current: ${term.name}`
                  : `Make ${term.name} · ${year.name} current`}
              </Button>
            )),
          )}
        </div>
      </section>
    </div>
  );
}
