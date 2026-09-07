import { PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra, formatGhs } from "@/lib/format/currency";
import { brand } from "@/config/brand";
import type { AdmissionFeeReceiptData, ThermalPaperWidth } from "@/lib/receipts/types";

function schoolAddressLine(school: AdmissionFeeReceiptData["school"]): string {
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

export function AdmissionFeeReceipt({
  data,
  paperWidth,
  id,
}: {
  data: AdmissionFeeReceiptData;
  paperWidth: ThermalPaperWidth;
  id?: string;
}) {
  const address = schoolAddressLine(data.school);
  const receiptRef = `${data.invoiceNumber}-P${data.paymentIndex}`;
  const paidAt = data.payment.paidAt ? formatDateTimeAccra(data.payment.paidAt) : "—";
  const methodLabel = PAYMENT_METHOD_LABELS[data.payment.method];

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

      <p className="thermal-receipt__title">ADMISSION FEE RECEIPT</p>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Receipt No." value={receiptRef} />
        <Row label="Date" value={paidAt} />
        <Row label="Invoice" value={data.invoiceNumber} />
      </div>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Applicant" value={data.applicant.fullName} />
        <Row label="Class" value={data.applicant.classLevelAppliedName} />
      </div>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Payment" value={formatGhs(data.payment.amount)} bold />
        <Row label="Method" value={methodLabel} />
        {data.payment.reference ? <Row label="Ref." value={data.payment.reference} /> : null}
      </div>

      <hr className="thermal-receipt__rule" />

      <div className="thermal-receipt__rows">
        <Row label="Fee total" value={formatGhs(data.invoiceTotal)} />
        <Row label="Paid to date" value={formatGhs(data.paidToDate)} />
        <Row label="This payment" value={formatGhs(data.payment.amount)} bold />
        <Row label="Balance" value={formatGhs(data.balanceOutstanding)} bold />
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
