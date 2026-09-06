import { formatGhs } from "@/lib/format/currency";
import type { FeeAmounts } from "@/lib/admissions/fees";
import { feeOutstanding } from "@/lib/admissions/fees";

function toAmount(value: { toString(): string } | string | number): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

type FeeProgressProps = {
  amounts: FeeAmounts | null | undefined;
  /** compact = table cell; default = detail/dashboard */
  variant?: "default" | "compact";
  className?: string;
};

export function FeeProgress({
  amounts,
  variant = "default",
  className = "",
}: FeeProgressProps) {
  if (!amounts) {
    return (
      <span className={`text-[13px] text-[var(--gray-500)] ${className}`}>
        No invoice
      </span>
    );
  }

  const total = toAmount(amounts.totalAmount);
  const paid = toAmount(amounts.amountPaid);
  const outstanding = feeOutstanding(amounts);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const fullyPaid = outstanding <= 0 && paid > 0;
  const barColor = fullyPaid
    ? "bg-[var(--success-600)]"
    : paid > 0
      ? "bg-[var(--warning-600)]"
      : "bg-[var(--gray-300)]";

  if (variant === "compact") {
    return (
      <div className={`min-w-[140px] max-w-[180px] ${className}`}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--gray-100)]">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 whitespace-nowrap font-variant-numeric tabular-nums text-[12px] text-[var(--gray-600)]">
          {formatGhs(paid.toFixed(2))}
          <span className="text-[var(--gray-400)]"> / </span>
          {formatGhs(total.toFixed(2))}
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="font-variant-numeric tabular-nums text-[15px] font-medium text-[var(--gray-900)]">
          {formatGhs(paid.toFixed(2))}
          <span className="font-normal text-[var(--gray-500)]">
            {" "}
            of {formatGhs(total.toFixed(2))}
          </span>
        </p>
        <p className="shrink-0 text-[13px] text-[var(--gray-500)]">{pct}%</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gray-100)]">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {outstanding > 0 ? (
        <p className="mt-2 font-variant-numeric tabular-nums text-[13px] text-[var(--gray-600)]">
          {formatGhs(outstanding.toFixed(2))} outstanding
        </p>
      ) : paid > 0 ? (
        <p className="mt-2 text-[13px] font-medium text-[var(--success-700)]">
          Fully paid
        </p>
      ) : null}
    </div>
  );
}
