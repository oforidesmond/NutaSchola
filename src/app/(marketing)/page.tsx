import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { VendorCredit } from "@/components/brand/VendorCredit";
import { Button } from "@/components/ui/primitives";
import { brand } from "@/config/brand";

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,var(--brand-50)_0%,var(--gray-50)_42%,var(--white)_100%)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo width={168} />
        <Link href="/login">
          <Button variant="secondary">Staff sign in</Button>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
        <section className="max-w-2xl">
          <p className="brand-wordmark text-[36px] leading-[44px] tracking-[-0.01em] text-[var(--brand-800)] sm:text-[48px] sm:leading-[56px]">
            {brand.productName}
          </p>
          <p className="mt-4 text-[17px] leading-[26px] text-[var(--gray-600)]">
            {brand.tagline}
          </p>
          <p className="mt-6 max-w-xl text-base text-[var(--gray-600)]">
            School Management System for Admissions, Fees, Attendance, Academics, and Parent Portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button>Continue to staff app</Button>
            </Link>
          </div>
        </section>

        {/* <section className="surface-raised p-6 sm:p-8">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
            Built for Creche through JHS 3
          </h2>
          <p className="mt-2 text-base text-[var(--gray-600)]">
            Designed for front-desk staff on everyday hardware and occasionally unreliable
            connections.
          </p>
        </section> */}
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <VendorCredit />
      </footer>
    </div>
  );
}
