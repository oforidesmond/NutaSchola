import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Shared branded chrome for login / reset / accept-invite. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,var(--brand-50)_0%,var(--gray-50)_45%,var(--white)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 18%, var(--brand-100) 0, transparent 42%),
            radial-gradient(circle at 88% 78%, var(--brand-50) 0, transparent 40%),
            repeating-linear-gradient(
              -12deg,
              transparent,
              transparent 22px,
              rgba(12, 108, 156, 0.04) 22px,
              rgba(12, 108, 156, 0.04) 23px
            )
          `,
        }}
      />

      <div className="motion-enter relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--white)] p-8 shadow-[var(--shadow-md)]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Link href="/" className="focus-ring rounded-[var(--radius-sm)]">
            <BrandLogo width={168} />
          </Link>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.005em] text-[var(--gray-900)]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-[15px] text-[var(--gray-600)]">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
