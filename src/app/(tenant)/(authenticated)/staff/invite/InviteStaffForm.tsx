"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { inviteStaffAction } from "./actions";
import type { UserRole } from "@prisma/client";

const INVITE_ROLES: { value: UserRole; label: string }[] = [
  { value: "SCHOOL_ADMIN", label: "School admin" },
  { value: "ADMISSIONS_OFFICER", label: "Admissions officer" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "TEACHER", label: "Teacher" },
  { value: "FRONT_DESK", label: "Front desk" },
  { value: "IT_SUPPORT", label: "IT support" },
];

export function InviteStaffForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const result = await inviteStaffAction({
      email: String(form.get("email") ?? ""),
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      role: String(form.get("role") ?? "FRONT_DESK") as UserRole,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage(
      "Invite sent. The staff member will receive an email with a link to set their password.",
    );
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="surface-raised flex max-w-xl flex-col gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" name="firstName" required />
        <Input label="Last name" name="lastName" required />
      </div>
      <Input label="Email" name="email" type="email" required />
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium text-[var(--gray-800)]">Role</span>
        <select
          name="role"
          className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base shadow-[var(--shadow-sm)]"
          defaultValue="FRONT_DESK"
        >
          {INVITE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={loading} className="self-start">
        Send invite
      </Button>
    </form>
  );
}
