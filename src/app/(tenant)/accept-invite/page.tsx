"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui/primitives";
import { acceptInviteAction } from "./actions";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailFromLink = searchParams.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const result = await acceptInviteAction({
      email: String(form.get("email") ?? ""),
      token,
      password: String(form.get("password") ?? ""),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage("Account activated. You can sign in now.");
  }

  if (!token) {
    return (
      <p className="text-[15px] text-[var(--error-700)]">
        This invite link is missing a token. Ask your administrator to resend the invite.
      </p>
    );
  }

  if (message) {
    return (
      <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
        {message}{" "}
        <Link href="/login" className="font-semibold underline">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Email" name="email" type="email" defaultValue={emailFromLink} required />
      <Input
        label="Choose a password"
        name="password"
        type="password"
        minLength={8}
        required
        hint="At least 8 characters"
      />
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={loading}>
        Activate account
      </Button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <AuthShell
      title="Accept invite"
      description="Set a password to activate your staff account for Excellence Kids."
    >
      <Suspense fallback={<p className="text-center text-[var(--gray-500)]">Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
