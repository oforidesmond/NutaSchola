"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui/primitives";
import { requestPasswordResetAction, resetPasswordAction } from "./actions";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailFromLink = searchParams.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const result = await requestPasswordResetAction(String(form.get("email") ?? ""));
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(
      "If that email exists, a reset link was sent. Check your inbox (and spam folder).",
    );
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const result = await resetPasswordAction({
      email: String(form.get("email") ?? ""),
      token,
      password: String(form.get("password") ?? ""),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("Password updated. You can sign in now.");
  }

  return (
    <div className="flex flex-col gap-5">
      {token ? (
        <form onSubmit={onReset} className="flex flex-col gap-4">
          <Input label="Email" name="email" type="email" defaultValue={emailFromLink} required />
          <Input
            label="New password"
            name="password"
            type="password"
            minLength={8}
            required
            hint="At least 8 characters"
          />
          <Button type="submit" loading={loading}>
            Update password
          </Button>
        </form>
      ) : (
        <form onSubmit={onRequest} className="flex flex-col gap-4">
          <Input label="Email" name="email" type="email" required />
          <Button type="submit" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
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
      <p className="text-center text-[15px]">
        <Link
          href="/login"
          className="focus-ring rounded-[var(--radius-xs)] font-medium text-[var(--brand-700)] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      description="Enter your work email and we’ll send a secure link to choose a new password."
    >
      <Suspense fallback={<p className="text-center text-[var(--gray-500)]">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
