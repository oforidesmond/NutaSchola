type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

const SIZE: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-11 w-11 text-[14px]",
};

/** Neutral initials avatar — never hashed brand colors (design language). */
export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--gray-200)] font-semibold text-[var(--gray-600)] ${SIZE[size]} ${className}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  );
}
