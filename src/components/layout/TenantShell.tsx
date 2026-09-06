"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { brand } from "@/config/brand";
import { getNavGroupsForRole, isNavItemActive, type NavGroup } from "./nav";
import { UserMenu } from "./UserMenu";

type TenantShellProps = {
  children: React.ReactNode;
  userName: string;
  schoolName: string;
  role: UserRole;
  signOutAction: () => Promise<void>;
  mustChangePassword?: boolean;
};

export function TenantShell({
  children,
  userName,
  schoolName,
  role,
  signOutAction,
  mustChangePassword = false,
}: TenantShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = getNavGroupsForRole(role);

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Desktop sidebar */}
      <aside className="glass-heavy sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] lg:flex">
        <div className="flex items-center justify-center border-b border-[var(--border-subtle)] px-3 py-2">
          <Link
            href={mustChangePassword ? "/account/change-password" : "/dashboard"}
            className="focus-ring block rounded-[var(--radius-sm)]"
          >
            <BrandLogo width={128} />
          </Link>
        </div>
        {!mustChangePassword ? (
          <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
            <SidebarNav
              pathname={pathname}
              groups={navGroups}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        ) : (
          <div className="flex-1 px-4 py-6 text-[13px] text-[var(--gray-600)]">
            Set a new password to continue using the app.
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--gray-900)]/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="glass-heavy absolute inset-y-0 left-0 flex w-[min(100%,280px)] flex-col shadow-[var(--shadow-xl)]">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
              <BrandLogo width={120} />
              <button
                type="button"
                className="focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--gray-100)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!mustChangePassword ? (
              <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
                <SidebarNav
                  pathname={pathname}
                  groups={navGroups}
                  onNavigate={() => setMobileOpen(false)}
                />
              </nav>
            ) : (
              <div className="flex-1 px-4 py-6 text-[13px] text-[var(--gray-600)]">
                Set a new password to continue using the app.
              </div>
            )}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-light sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] px-4 sm:px-6">
          <button
            type="button"
            className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--gray-100)] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-[var(--gray-900)] lg:hidden">
            {brand.productName}
          </span>
          <div className="ml-auto">
            <UserMenu
              userName={userName}
              schoolName={schoolName}
              signOutAction={signOutAction}
              mustChangePassword={mustChangePassword}
            />
          </div>
        </header>
        <main className="motion-enter mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  groups,
  onNavigate,
}: {
  pathname: string;
  groups: NavGroup[];
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label ? (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--gray-500)]">
              {group.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`focus-ring relative flex min-h-11 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-[15px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--brand-50)] text-[var(--brand-700)]"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-600)]"
                        aria-hidden
                      />
                    ) : null}
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
