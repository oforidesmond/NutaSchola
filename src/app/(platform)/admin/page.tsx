import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";

/**
 * Platform SUPER_ADMIN stub — folder shape for Phase 7 SaaS admin.
 * Middleware already gates /admin to SUPER_ADMIN role.
 */
export default function PlatformAdminPage() {
  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <header className="border-b border-[var(--gray-200)] bg-[var(--white)] px-6 py-4">
        <BrandLogo width={140} />
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PageHeader
          title="Platform admin"
          description="Stub for future multi-school operations (subscriptions, onboarding, support)."
        />
        <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
          <StatusBadge label="Stub" tone="info" />
          <p className="mt-4 text-base text-[var(--gray-600)]">
            This route exists so Phase 7 can grow without reshaping the app. Excellence
            Kids staff should use the tenant app instead.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-[var(--brand-700)]"
          >
            Back to school dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
