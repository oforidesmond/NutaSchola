"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AccessDeniedBanner() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard", { scroll: false });
  }, [router]);

  return (
    <p
      role="status"
      className="rounded-[var(--radius-sm)] border border-[var(--warning-200,#f5d9a8)] bg-[var(--warning-50,#fff8eb)] px-3 py-2.5 text-[15px] text-[#8a4a0c]"
    >
      You don&apos;t have access to that area. Choose something from the sidebar instead.
    </p>
  );
}
