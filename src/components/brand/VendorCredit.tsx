import { brand } from "@/config/brand";

type VendorCreditProps = {
  className?: string;
};

/** Quiet “Powered by” vendor attribution with link to the company site. */
export function VendorCredit({ className }: VendorCreditProps) {
  return (
    <p
      className={`text-[12px] leading-4 text-[var(--gray-500)] ${className ?? ""}`.trim()}
    >
      Powered by{" "}
      <a
        href={brand.vendorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring rounded-[var(--radius-xs)] font-medium text-[var(--gray-600)] underline-offset-2 hover:text-[var(--brand-700)] hover:underline"
      >
        {brand.vendorName}
      </a>
    </p>
  );
}
