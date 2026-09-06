"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type UserMenuProps = {
  userName: string;
  schoolName: string;
  signOutAction: () => Promise<void>;
  mustChangePassword?: boolean;
};

export function UserMenu({
  userName,
  schoolName,
  signOutAction,
  mustChangePassword = false,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function requestSignOut() {
    setOpen(false);
    setConfirmSignOut(true);
  }

  function confirmAndSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-[var(--gray-100)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={userName} size="sm" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="surface-raised absolute right-0 z-50 mt-2 w-64 overflow-hidden border border-[var(--border-subtle)] shadow-[var(--shadow-lg)]"
        >
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="truncate text-[14px] font-medium text-[var(--gray-900)]">{userName}</p>
            <p className="truncate text-[13px] text-[var(--gray-500)]">{schoolName}</p>
          </div>
          <div className="p-1.5">
            {!mustChangePassword ? (
              <Link
                href="/account/change-password"
                role="menuitem"
                className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[15px] font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                onClick={() => setOpen(false)}
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                Change password
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="focus-ring flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[15px] font-medium text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              onClick={requestSignOut}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        consequence="You will need to sign in again to access this school's admin area."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        loading={isPending}
        onConfirm={confirmAndSignOut}
        onCancel={() => {
          if (!isPending) setConfirmSignOut(false);
        }}
      />
    </div>
  );
}
