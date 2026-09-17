"use client";

import { FormEvent, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { StationerySaleReceiptDialog } from "@/components/receipts/StationerySaleReceiptDialog";
import { ADMISSION_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/admissions/labels";
import { formatGhs } from "@/lib/format/currency";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { PaymentMethod } from "@prisma/client";
import {
  getStationeryReceiptPdfAction,
  recordStationerySaleAction,
} from "./actions";

export type ItemRow = {
  id: string;
  name: string;
  unitPrice: string;
  stockQuantity: number;
  isActive: boolean;
};

export type SaleLineRow = {
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type SaleRow = {
  id: string;
  createdAt: string;
  totalAmount: string;
  amountPaid: string;
  receiptNumber: string | null;
  studentLabel: string;
  method: PaymentMethod;
  lines: SaleLineRow[];
};

export type StudentOption = {
  id: string;
  label: string;
};

export function StationeryClient({
  items,
  sales,
  students,
  school,
}: {
  items: ItemRow[];
  sales: SaleRow[];
  students: StudentOption[];
  school: ReportSchoolBrand;
}) {
  return (
    <div className="flex flex-col gap-8">
      <NewSaleForm items={items.filter((i) => i.isActive)} students={students} />
      <SaleHistory sales={sales} school={school} />
    </div>
  );
}

function NewSaleForm({
  items,
  students,
}: {
  items: ItemRow[];
  students: StudentOption[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [studentId, setStudentId] = useState("");
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 20);
    return students.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 20);
  }, [students, studentQuery]);

  const total = useMemo(() => {
    let sum = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const item = items.find((i) => i.id === id);
      if (!item || qty < 1) continue;
      sum += Number(item.unitPrice) * qty;
    }
    return Number(sum.toFixed(2));
  }, [cart, items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const lines = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    if (!lines.length) {
      setError("Add at least one item.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    if (studentId) formData.set("studentId", studentId);
    formData.set("method", method);
    formData.set("linesJson", JSON.stringify(lines));
    const result = await recordStationerySaleAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(`Sale recorded. Receipt ${result.data.receiptNumber}.`);
    setCart({});
  }

  return (
    <section className="surface-raised p-6">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">New sale</h2>
      <p className="mt-1 text-[15px] text-[var(--gray-600)]">
        Link a student or leave blank for a walk-in.
      </p>
      {message ? (
        <p className="mt-3 text-[15px] text-[var(--success-700)]">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-[15px] text-[var(--error-700)]">{error}</p> : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <Input
            label="Student search (optional — walk-in if empty)"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Name or admission number"
          />
          <select
            className="mt-2 min-h-11 w-full max-w-xl rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Walk-in (no student)</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <ul className="divide-y divide-[var(--gray-100)] rounded-[var(--radius-sm)] border border-[var(--gray-100)]">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
              <div>
                <p className="font-medium text-[var(--gray-900)]">{item.name}</p>
                <p className="text-[13px] text-[var(--gray-500)]">
                  {formatGhs(item.unitPrice)} · stock {item.stockQuantity}
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={item.stockQuantity}
                value={cart[item.id] ?? 0}
                onChange={(e) =>
                  setCart((prev) => ({
                    ...prev,
                    [item.id]: Number(e.target.value) || 0,
                  }))
                }
                className="w-20 min-h-10 rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-2 text-center"
              />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Payment method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {ADMISSION_PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[18px] font-semibold tabular-nums">{formatGhs(total)}</p>
          <Button type="submit" loading={loading}>
            Record sale
          </Button>
        </div>
      </form>
    </section>
  );
}

function SaleHistory({
  sales,
  school,
}: {
  sales: SaleRow[];
  school: ReportSchoolBrand;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [printSaleId, setPrintSaleId] = useState<string | null>(null);

  const printSale = printSaleId ? sales.find((s) => s.id === printSaleId) : null;

  async function downloadPdf(saleId: string) {
    setLoadingId(saleId);
    const result = await getStationeryReceiptPdfAction(saleId);
    setLoadingId(null);
    if (!result.ok) return;
    const bytes = Uint8Array.from(atob(result.data.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="surface-raised p-6">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Sale history</h2>
      <ul className="mt-4 divide-y divide-[var(--gray-100)]">
        {sales.length === 0 ? (
          <li className="py-4 text-[15px] text-[var(--gray-600)]">No sales yet.</li>
        ) : (
          sales.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-[var(--gray-900)]">
                  {s.receiptNumber ?? s.id} · {formatGhs(s.totalAmount)}
                </p>
                <p className="text-[14px] text-[var(--gray-600)]">
                  {s.studentLabel} · {PAYMENT_METHOD_LABELS[s.method] ?? s.method} ·{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.receiptNumber ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPrintSaleId(s.id)}
                    className="inline-flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print receipt
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  loading={loadingId === s.id}
                  onClick={() => void downloadPdf(s.id)}
                >
                  Download PDF receipt
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      {printSale && printSale.receiptNumber ? (
        <StationerySaleReceiptDialog
          open
          onClose={() => setPrintSaleId(null)}
          school={school}
          sale={{
            receiptNumber: printSale.receiptNumber,
            createdAt: printSale.createdAt,
            payerName: printSale.studentLabel,
            method: printSale.method,
            totalAmount: printSale.totalAmount,
            amountPaid: printSale.amountPaid,
            lines: printSale.lines,
          }}
        />
      ) : null}
    </section>
  );
}
