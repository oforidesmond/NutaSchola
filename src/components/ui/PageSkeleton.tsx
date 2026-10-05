export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-48 max-w-full rounded-[var(--radius-sm)]" />
          <div className="skeleton h-4 w-72 max-w-full rounded-[var(--radius-sm)]" />
        </div>
        <div className="skeleton h-11 w-32 rounded-[var(--radius-sm)]" />
      </div>

      <div className="surface-raised flex flex-col gap-4 p-5">
        <div className="skeleton h-4 w-1/3 max-w-xs rounded-[var(--radius-sm)]" />
        <div className="skeleton h-4 w-full rounded-[var(--radius-sm)]" />
        <div className="skeleton h-4 w-5/6 rounded-[var(--radius-sm)]" />
        <div className="skeleton h-4 w-2/3 rounded-[var(--radius-sm)]" />
      </div>

      <div className="surface-raised overflow-hidden">
        <div className="border-b border-[var(--gray-200)] px-5 py-3">
          <div className="skeleton h-4 w-40 rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex flex-col gap-0 divide-y divide-[var(--gray-100)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="skeleton h-4 w-1/4 rounded-[var(--radius-sm)]" />
              <div className="skeleton h-4 w-1/5 rounded-[var(--radius-sm)]" />
              <div className="skeleton ml-auto h-4 w-16 rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
