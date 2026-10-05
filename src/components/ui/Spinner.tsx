type SpinnerProps = {
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-3.5 w-3.5 border-[1.5px]",
  md: "h-4 w-4 border-2",
} as const;

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-current border-r-transparent ${SIZE_CLASS[size]} ${className}`}
      aria-hidden
    />
  );
}
