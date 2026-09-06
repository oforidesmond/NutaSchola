"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-12 text-center">
      <h1 className="text-[24px] font-semibold text-[var(--gray-900)]">
        Something went wrong
      </h1>
      <p className="text-[15px] text-[var(--gray-600)]">
        We couldn&apos;t load this page. You can try again or return to the dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-4 text-[15px] font-semibold text-[var(--gray-800)] hover:bg-[var(--gray-50)]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
