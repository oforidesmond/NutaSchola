"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApplicationSource, RelationshipType } from "@prisma/client";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { SOURCE_LABELS, RELATIONSHIP_LABELS } from "@/lib/admissions/labels";
import { createApplication } from "./actions";

type ClassLevelOption = { id: string; name: string };
type AcademicYearOption = { id: string; name: string; isCurrent: boolean };

const SOURCE_OPTIONS = Object.values(ApplicationSource);
const RELATIONSHIP_OPTIONS = Object.values(RelationshipType);

const STEPS = [
  { id: 1, label: "Bio-data" },
  { id: 2, label: "School & class" },
  { id: 3, label: "Guardian" },
] as const;

export function NewApplicationForm({
  classLevels,
  academicYears,
  defaultAcademicYearId,
}: {
  classLevels: ClassLevelOption[];
  academicYears: AcademicYearOption[];
  defaultAcademicYearId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [stepHint, setStepHint] = useState<string | null>(null);

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function validateStep(form: HTMLFormElement, current: number): boolean {
    setStepHint(null);
    const data = new FormData(form);

    if (current === 1) {
      if (!String(data.get("firstName") ?? "").trim() || !String(data.get("lastName") ?? "").trim()) {
        setStepHint("First name and last name are required.");
        return false;
      }
      if (!String(data.get("dateOfBirth") ?? "").trim()) {
        setStepHint("Date of birth is required.");
        return false;
      }
    }

    if (current === 2) {
      if (!String(data.get("academicYearId") ?? "").trim()) {
        setStepHint("Select an academic year.");
        return false;
      }
      if (!String(data.get("classLevelAppliedId") ?? "").trim()) {
        setStepHint("Select the class applied for.");
        return false;
      }
    }

    if (current === 3) {
      if (
        !String(data.get("guardianFirstName") ?? "").trim() ||
        !String(data.get("guardianLastName") ?? "").trim()
      ) {
        setStepHint("Guardian first and last name are required.");
        return false;
      }
      if (!String(data.get("guardianPhone") ?? "").trim()) {
        setStepHint("Guardian phone is required.");
        return false;
      }
    }

    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) {
      if (!validateStep(event.currentTarget, step)) return;
      setStep((s) => s + 1);
      return;
    }

    if (!validateStep(event.currentTarget, 3)) return;

    setLoading(true);
    setError(null);
    setFieldErrors({});

    const result = await createApplication(new FormData(event.currentTarget));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    router.push(`/admissions/applications/${result.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-6">
      <nav aria-label="Application steps" className="surface-raised px-4 py-3 sm:px-5">
        <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
          {STEPS.map((s, index) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-4">
                {index > 0 ? (
                  <span className="hidden h-px w-6 bg-[var(--gray-200)] sm:block" aria-hidden />
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  className={`focus-ring flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[14px] font-medium ${
                    active
                      ? "text-[var(--brand-700)]"
                      : done
                        ? "text-[var(--success-700)] hover:bg-[var(--gray-50)]"
                        : "text-[var(--gray-400)]"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      active
                        ? "bg-[var(--brand-600)] text-white"
                        : done
                          ? "bg-[var(--success-600)] text-white"
                          : "bg-[var(--gray-200)] text-[var(--gray-500)]"
                    }`}
                  >
                    {done ? "✓" : s.id}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className={`surface-raised p-6 ${step === 1 ? "" : "hidden"}`} aria-hidden={step !== 1}>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Applicant bio-data</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Input label="First name" name="firstName" required={step === 1} error={fieldError("firstName")} />
          <Input label="Middle name" name="middleName" />
          <Input label="Last name" name="lastName" required={step === 1} error={fieldError("lastName")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            required={step === 1}
            error={fieldError("dateOfBirth")}
          />
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Gender</span>
            <select
              name="gender"
              required
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
              defaultValue="MALE"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <Input label="Nationality" name="nationality" defaultValue="Ghanaian" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Religion" name="religion" />
        </div>
        <div className="mt-4">
          <Textarea label="Home address" name="homeAddress" />
        </div>
      </section>

      <section className={`surface-raised p-6 ${step === 2 ? "" : "hidden"}`} aria-hidden={step !== 2}>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Previous school &amp; class</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Previous school name" name="previousSchoolName" />
          <Input label="Previous class completed" name="previousClassCompleted" />
        </div>
        <div className="mt-6 grid gap-4 border-t border-[var(--gray-100)] pt-6 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Academic year</span>
            <select
              name="academicYearId"
              required={step === 2}
              defaultValue={defaultAcademicYearId}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              <option value="">Select year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
            {fieldError("academicYearId") ? (
              <span className="text-[13px] text-[var(--error-700)]">{fieldError("academicYearId")}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Class applied for</span>
            <select
              name="classLevelAppliedId"
              required={step === 2}
              defaultValue=""
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              <option value="">Select class</option>
              {classLevels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("classLevelAppliedId") ? (
              <span className="text-[13px] text-[var(--error-700)]">
                {fieldError("classLevelAppliedId")}
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Source</span>
            <select
              name="source"
              required
              defaultValue="WALK_IN"
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={`surface-raised p-6 ${step === 3 ? "" : "hidden"}`} aria-hidden={step !== 3}>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Guardian (at least one)</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          If a guardian with this phone already exists at this school, that record is linked. More
          guardians can be added after creation.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Guardian first name"
            name="guardianFirstName"
            required={step === 3}
            error={fieldError("guardianFirstName")}
          />
          <Input
            label="Guardian last name"
            name="guardianLastName"
            required={step === 3}
            error={fieldError("guardianLastName")}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            name="guardianPhone"
            required={step === 3}
            placeholder="+233…"
            error={fieldError("guardianPhone")}
          />
          <Input label="Alternate phone" name="guardianAltPhone" placeholder="+233…" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Email (optional)"
            name="guardianEmail"
            type="email"
            error={fieldError("guardianEmail")}
          />
          <Input label="Occupation" name="guardianOccupation" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Relationship</span>
            <select
              name="guardianRelationship"
              required
              defaultValue="MOTHER"
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RELATIONSHIP_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <Input label="Address" name="guardianAddress" />
        </div>
      </section>

      {stepHint ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--warning-50)] px-3 py-2 text-[15px] text-[#8a4a0c]">
          {stepHint}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        <Button type="submit" loading={loading}>
          {step < 3 ? "Continue" : "Create application"}
        </Button>
      </div>
    </form>
  );
}
