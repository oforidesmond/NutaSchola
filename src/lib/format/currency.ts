import { brand } from "@/config/brand";

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: brand.currency,
  minimumFractionDigits: 2,
});

export function formatGhs(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return `${brand.currency} 0.00`;
  return currencyFormatter.format(value);
}

export function formatDateAccra(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: brand.timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
