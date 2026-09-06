"use client";

import { FormEvent, useState } from "react";
import { RelationshipType } from "@prisma/client";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { RELATIONSHIP_LABELS } from "@/lib/admissions/labels";
import { addGuardianToApplication } from "./actions";

export type GuardianRow = {
  applicationGuardianId: string;
  guardianId: string;
  firstName: string;
  lastName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  relationship: RelationshipType;
  isPrimaryContact: boolean;
};

const RELATIONSHIP_OPTIONS = Object.values(RelationshipType);

export function GuardiansPanel({
  applicationId,
  guardians,
}: {
  applicationId: string;
  guardians: GuardianRow[];
}) {
  const [showForm, setShowForm] = useState(guardians.length === 0);
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);

    const form = event.currentTarget;
    const result = await addGuardianToApplication(new FormData(form));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    form.reset();
    setMessage("Guardian saved.");
    setShowForm(false);
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Guardians</h2>
        <Button type="button" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add guardian"}
        </Button>
      </div>

      {guardians.length === 0 ? (
        <p className="mt-3 text-[15px] text-[var(--gray-600)]">No guardians linked yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--gray-100)]">
          {guardians.map((g) => (
            <li key={g.applicationGuardianId} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div>
                <p className="flex items-center gap-2 text-[15px] font-medium text-[var(--gray-900)]">
                  {g.firstName} {g.lastName}
                  {g.isPrimaryContact ? <StatusBadge label="Primary" tone="info" /> : null}
                </p>
                <p className="mt-1 text-[13px] text-[var(--gray-600)]">
                  {RELATIONSHIP_LABELS[g.relationship]} · {g.phone}
                  {g.altPhone ? ` / ${g.altPhone}` : ""}
                  {g.email ? ` · ${g.email}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4 border-t border-[var(--gray-100)] pt-5">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="text-[13px] text-[var(--gray-600)]">
            If a guardian with this phone already exists at this school, the existing record is
            linked instead of creating a duplicate.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" required error={fieldError("firstName")} />
            <Input label="Last name" name="lastName" required error={fieldError("lastName")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" name="phone" required placeholder="+233…" error={fieldError("phone")} />
            <Input label="Alternate phone" name="altPhone" placeholder="+233…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email (optional)" name="email" type="email" error={fieldError("email")} />
            <Input label="Occupation" name="occupation" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium text-[var(--gray-800)]">Relationship</span>
              <select
                name="relationship"
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
            <Input label="Address" name="address" />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--gray-800)]">
            <input
              type="checkbox"
              name="isPrimaryContact"
              defaultChecked={guardians.length === 0}
              className="size-4 rounded border-[var(--gray-300)] text-[var(--brand-600)]"
            />
            Mark as primary contact
          </label>
          <Button type="submit" loading={loading} className="self-start">
            Save guardian
          </Button>
        </form>
      ) : null}
    </section>
  );
}
