import type { ReactNode } from "react";

type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "status-badge--neutral",
  info: "status-badge--info",
  success: "status-badge--success",
  warning: "status-badge--warning",
  error: "status-badge--error",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`status-badge ${TONE_CLASS[tone]}`}>{label}</span>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 text-[15px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] active:bg-[var(--brand-800)]",
    secondary:
      "bg-[var(--gray-100)] text-[var(--gray-900)] hover:bg-[var(--gray-200)]",
    ghost: "bg-transparent text-[var(--brand-700)] hover:bg-[var(--brand-50)]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex flex-col gap-2" htmlFor={inputId}>
      <span className="text-[15px] font-medium text-[var(--gray-800)]">{label}</span>
      <input
        id={inputId}
        className={`min-h-11 rounded-[var(--radius-sm)] border bg-[var(--white)] px-3 text-base text-[var(--gray-900)] shadow-[var(--shadow-sm)] placeholder:text-[var(--gray-400)] focus:border-[var(--brand-600)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-100)] ${
          error ? "border-[var(--error-600)]" : "border-[var(--gray-200)]"
        } ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-[13px] text-[var(--error-700)]">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-[var(--gray-500)]">{hint}</span>
      ) : null}
    </label>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex flex-col gap-2" htmlFor={inputId}>
      <span className="text-[15px] font-medium text-[var(--gray-800)]">{label}</span>
      <textarea
        id={inputId}
        className={`min-h-24 rounded-[var(--radius-sm)] border bg-[var(--white)] px-3 py-2 text-base text-[var(--gray-900)] shadow-[var(--shadow-sm)] placeholder:text-[var(--gray-400)] focus:border-[var(--brand-600)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-100)] ${
          error ? "border-[var(--error-600)]" : "border-[var(--gray-200)]"
        } ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-[13px] text-[var(--error-700)]">{error}</span>
      ) : null}
    </label>
  );
}

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.005em] text-[var(--gray-900)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-base text-[var(--gray-600)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
