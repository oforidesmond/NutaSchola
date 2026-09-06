"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { VendorCredit } from "@/components/brand/VendorCredit";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button, Input } from "@/components/ui/primitives";
import { loginAction } from "./actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = await loginAction(email, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@school.edu.gh"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={loading}>
        Sign in
      </Button>
      <p className="text-center text-[15px] text-[var(--gray-600)]">
        Forgot password?{" "}
        <Link
          href="/reset-password"
          className="focus-ring rounded-[var(--radius-xs)] font-medium text-[var(--brand-700)] hover:underline"
        >
          Reset it
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Staff sign in"
      description="Use the account invited by your school administrator."
      footer={<VendorCredit className="text-center" />}
    >
      <Suspense fallback={<p className="text-center text-[var(--gray-500)]">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
