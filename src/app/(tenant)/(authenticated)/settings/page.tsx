import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { SETTINGS_LINKS } from "@/components/layout/nav";

export default async function SettingsHubPage() {
  const { user } = await requirePageAccess(ACTIONS.SCHOOL_SETTINGS_READ);
  const links = SETTINGS_LINKS.filter((item) => can(user.role, item.action));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Choose a settings area to view or update for this school."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="interactive-card surface-raised focus-ring flex items-center gap-3 p-4"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-50)] text-[var(--brand-700)]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[var(--gray-900)]">
                  {item.label}
                </span>
                <span className="block text-[13px] text-[var(--gray-500)]">
                  {item.description}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--gray-400)]" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
