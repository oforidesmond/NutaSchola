import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { signOut } from "@/lib/auth";

type TenantShellProps = {
  children: React.ReactNode;
  userName: string;
  schoolName: string;
};

export function TenantShell({ children, userName, schoolName }: TenantShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <header className="glass-light sticky top-0 z-40 border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="shrink-0">
              <BrandLogo width={140} />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/admissions">Admissions</NavLink>
              <NavLink href="/settings/academic">Academic</NavLink>
              <NavLink href="/settings/classes">Classes</NavLink>
              {/* <NavLink href="/settings/subjects">Subjects</NavLink> */}
              <NavLink href="/settings/fees">Fees</NavLink>
              <NavLink href="/settings/school">School</NavLink>
              <NavLink href="/staff/invite">Invite</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium text-[var(--gray-900)]">{userName}</p>
              <p className="text-[12px] text-[var(--gray-500)]">{schoolName}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="min-h-11 rounded-[var(--radius-sm)] px-3 text-[15px] font-medium text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-[var(--border-subtle)] px-4 py-2 lg:hidden">
          <NavLink href="/admissions">Admissions</NavLink>
          <NavLink href="/settings/academic">Academic</NavLink>
          <NavLink href="/settings/classes">Classes</NavLink>
          <NavLink href="/settings/fees">Fees</NavLink>
          <NavLink href="/settings/school">School</NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-[15px] font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-900)]"
    >
      {children}
    </Link>
  );
}
