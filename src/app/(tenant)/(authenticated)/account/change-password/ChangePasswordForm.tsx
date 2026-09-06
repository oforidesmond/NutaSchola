"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { changePasswordAction } from "./actions";

type ChangePasswordFormProps = {
  forced?: boolean;
};

export function ChangePasswordForm({ forced = false }: ChangePasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);

    const form = new FormData(formEl);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setFieldErrors({ confirmPassword: ["Passwords do not match"] });
      return;
    }
    if (newPassword.length < 8) {
      setLoading(false);
      setFieldErrors({ newPassword: ["Use at least 8 characters"] });
      return;
    }

    const result = await changePasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.fieldErrors) {
        setFieldErrors(result.error.fieldErrors);
      }
      return;
    }

    if (forced) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage("Password updated.");
    formEl.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface-raised flex w-full flex-col gap-4 p-6">
      {forced ? (
        <p className="text-[15px] text-[var(--gray-700)]">
          Your account still uses the default password. Choose a new one before continuing.
        </p>
      ) : null}
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
      <Input
        label="Current password"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        error={fieldErrors.currentPassword?.[0]}
      />
      <Input
        label="New password"
        name="newPassword"
        type="password"
        minLength={8}
        required
        autoComplete="new-password"
        hint="At least 8 characters"
        error={fieldErrors.newPassword?.[0]}
      />
      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        minLength={8}
        required
        autoComplete="new-password"
        error={fieldErrors.confirmPassword?.[0]}
      />
      <Button type="submit" loading={loading} className="w-full">
        {forced ? "Set new password" : "Update password"}
      </Button>
    </form>
  );
}
