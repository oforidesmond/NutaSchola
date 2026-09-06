export function ReadOnlyBanner({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="mb-4 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2.5 text-[15px] text-[var(--gray-700)]"
    >
      {message}
    </p>
  );
}
