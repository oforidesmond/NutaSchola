import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageHeader, StatusBadge } from "@/components/ui/primitives";

/**
 * Platform SUPER_ADMIN stub — folder shape for Phase 7 SaaS admin.
 * Middleware already gates /admin to SUPER_ADMIN role.
 */
export default function PlatformAdminPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--brand-50),var(--gray-50))]">
      <header className="glass-light border-b border-[var(--gray-200)] px-6 py-4">
        <BrandLogo width={140} />
      </header>
      <main className="motion-enter mx-auto max-w-4xl px-6 py-10">
        <PageHeader
          title="Platform admin"
          description="Reserved for future multi-school operations — subscriptions, onboarding, and support."
        />
        <div className="surface-raised p-6">
          <StatusBadge label="Coming later" tone="info" />
          <p className="mt-4 text-base text-[var(--gray-600)]">
            This route is intentionally light until Phase 7. Excellence Kids staff should use the
            school app instead.
          </p>
          <Link
            href="/dashboard"
            className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] font-semibold text-[var(--brand-700)] hover:underline"
          >
            Back to school dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
