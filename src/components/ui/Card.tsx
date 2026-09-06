import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`mb-3 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-[var(--gray-500)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--gray-400)]" aria-hidden />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded-[var(--radius-xs)] font-medium text-[var(--brand-700)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "font-medium text-[var(--gray-700)]" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type CardProps = {
  children: ReactNode;
  variant?: "flat" | "raised" | "emphasis" | "danger";
  className?: string;
  interactive?: boolean;
};

const CARD_VARIANT: Record<NonNullable<CardProps["variant"]>, string> = {
  flat: "surface-flat",
  raised: "surface-raised",
  emphasis: "surface-emphasis",
  danger: "surface-danger",
};

export function Card({
  children,
  variant = "raised",
  className = "",
  interactive = false,
}: CardProps) {
  return (
    <section
      className={`${CARD_VARIANT[variant]} p-5 sm:p-6 ${interactive ? "interactive-card" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
};

export function Select({
  label,
  error,
  hint,
  id,
  className = "",
  options,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex flex-col gap-2" htmlFor={selectId}>
      <span className="text-[15px] font-medium text-[var(--gray-800)]">{label}</span>
      <select
        id={selectId}
        className={`min-h-11 rounded-[var(--radius-sm)] border bg-[var(--white)] px-3 text-base text-[var(--gray-900)] shadow-[var(--shadow-sm)] focus:border-[var(--brand-600)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-100)] ${
          error ? "border-[var(--error-600)]" : "border-[var(--gray-200)]"
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-[13px] text-[var(--error-700)]">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-[var(--gray-500)]">{hint}</span>
      ) : null}
    </label>
  );
}
