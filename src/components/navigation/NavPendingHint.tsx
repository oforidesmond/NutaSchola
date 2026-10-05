"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/Spinner";

export function NavPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      className="nav-pending-hint ml-auto inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
      data-pending={pending ? "true" : "false"}
      aria-hidden
    >
      <Spinner size="sm" className="text-current" />
    </span>
  );
}
