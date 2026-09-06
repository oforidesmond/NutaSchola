import Link from "next/link";

type ExportLink = {
  label: string;
  href: string;
};

/**
 * Lightweight export action group for list/detail headers.
 * Links hit authenticated API routes that stream CSV/PDF downloads.
 */
export function ExportMenu({ links }: { links: ExportLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-4 text-[15px] font-semibold text-[var(--gray-800)] transition hover:bg-[var(--gray-100)]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
