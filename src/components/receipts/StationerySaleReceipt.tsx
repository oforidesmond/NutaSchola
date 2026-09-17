import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import { brand } from "@/config/brand";
import type { StationerySaleReceiptData, ThermalPaperWidth } from "@/lib/receipts/types";

function schoolAddressLine(school: StationerySaleReceiptData["school"]): string {
  return [school.address, school.city, school.region].filter(Boolean).join(", ");
}

function formatDateTimeAccra(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const day = formatDateAccra(value);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: brand.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);
  return `${day} · ${time}`;
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`thermal-receipt__row${bold ? " thermal-receipt__row--bold" : ""}`}>
      <span>{label}</span>
      <span className="thermal-receipt__row-value">{value}</span>
    </div>
  );
}

export function StationerySaleReceipt({
  data,
  paperWidth,
  id,
}: {
  data: StationerySaleReceiptData;
  paperWidth: ThermalPaperWidth;
  id?: string;
}) {
  const address = schoolAddressLine(data.school);
  const soldAt = formatDateTimeAccra(data.soldAt);
  const methodLabel = PAYMENT_METHOD_LABELS[data.method];

  return (
    <article
      id={id}
      className="thermal-receipt"
      data-paper-width={paperWidth}
    >
      <header className="thermal-receipt__header">
        <p className="thermal-receipt__school">{data.school.name}</p>
        {address ? <p className="thermal-receipt__meta">{address}</p> : null}
        {data.school.contactPhone ? (
          <p className="thermal-receipt__meta">Tel: {data.school.contactPhone}</p>
        ) : null}
        {data.school.contactEmail ? (
          <p className="thermal-receipt__meta">{data.school.contactEmail}</p>
        ) : null}
      </header>

      <hr className="thermal-receipt__rule" />

      <p className="thermal-receipt__title">STATIONERY RECEIPT</p>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Receipt No." value={data.receiptNumber} />
        <Row label="Date" value={soldAt} />
        <Row label="Customer" value={data.payerName} />
      </div>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        {data.lines.map((line, index) => (
          <Row
            key={`${line.name}-${index}`}
            label={`${line.name} × ${line.quantity}`}
            value={formatGhs(line.lineTotal)}
          />
        ))}
      </div>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Total" value={formatGhs(data.totalAmount)} bold />
        <Row label="Paid" value={formatGhs(data.amountPaid)} bold />
        <Row label="Method" value={methodLabel} />
      </div>

      <hr className="thermal-receipt__rule" />

      <footer className="thermal-receipt__footer">
        <p className="thermal-receipt__footer-strong">Official receipt</p>
        <p className="thermal-receipt__footer-note">Keep this for your records.</p>
        <p className="thermal-receipt__footer-note">Thank you.</p>
      </footer>
    </article>
  );
}
