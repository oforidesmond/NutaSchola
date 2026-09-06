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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Applicant bio-data</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Input
            label="First name"
            name="firstName"
            required
            error={fieldError("firstName")}
          />
          <Input label="Middle name" name="middleName" />
          <Input label="Last name" name="lastName" required error={fieldError("lastName")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            required
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

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Previous school</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Previous school name" name="previousSchoolName" />
          <Input label="Previous class completed" name="previousClassCompleted" />
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Applying for</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Academic year</span>
            <select
              name="academicYearId"
              required
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
              <span className="text-[13px] text-[var(--error-700)]">
                {fieldError("academicYearId")}
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Class applied for</span>
            <select
              name="classLevelAppliedId"
              required
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

      <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
          Guardian (at least one)
        </h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          If a guardian with this phone number already exists at this school, the existing record
          is linked instead of creating a duplicate. This guardian is marked as the primary
          contact; more guardians can be added from the application page after it&apos;s created.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Guardian first name"
            name="guardianFirstName"
            required
            error={fieldError("guardianFirstName")}
          />
          <Input
            label="Guardian last name"
            name="guardianLastName"
            required
            error={fieldError("guardianLastName")}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            name="guardianPhone"
            required
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

      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="self-start">
        Create application
      </Button>
    </form>
  );
}
