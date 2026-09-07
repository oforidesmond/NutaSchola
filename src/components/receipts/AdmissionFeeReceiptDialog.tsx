"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { AdmissionFeeReceipt } from "@/components/receipts/AdmissionFeeReceipt";
import {
  buildAdmissionFeeReceiptData,
  paymentSelectLabel,
} from "@/lib/receipts/build-admission-fee-receipt";
import {
  printThermalElement,
  readStoredPaperWidth,
  storePaperWidth,
} from "@/lib/receipts/print-thermal";
import { thermalReceiptCss } from "@/lib/receipts/thermal-receipt-css";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { ReceiptApplicant, ReceiptPayment, ThermalPaperWidth } from "@/lib/receipts/types";

type InvoiceForDialog = {
  invoiceNumber: string;
  totalAmount: string;
  payments: ReceiptPayment[];
};

export function AdmissionFeeReceiptDialog({
  open,
  onClose,
  school,
  applicant,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  school: ReportSchoolBrand;
  applicant: ReceiptApplicant;
  invoice: InvoiceForDialog;
}) {
  const titleId = useId();
  const receiptDomId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>("80mm");
  const [paymentId, setPaymentId] = useState(invoice.payments[0]?.id ?? "");
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPaperWidth(readStoredPaperWidth());
    setPaymentId(invoice.payments[0]?.id ?? "");
    setPrintError(null);
  }, [open, invoice.payments]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const receiptData = useMemo(
    () =>
      paymentId
        ? buildAdmissionFeeReceiptData({ school, applicant, invoice, paymentId })
        : null,
    [school, applicant, invoice, paymentId],
  );

  async function onPrint() {
    if (!receiptData) return;
    const node = document.getElementById(receiptDomId);
    if (!node) {
      setPrintError("Receipt preview is not ready.");
      return;
    }
    setPrinting(true);
    setPrintError(null);
    storePaperWidth(paperWidth);
    try {
      await printThermalElement(node, paperWidth);
    } catch {
      setPrintError("Could not open the print dialog. Try again.");
    } finally {
      setPrinting(false);
    }
  }

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%-2rem,28rem)] rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-0 shadow-[var(--shadow-xl)] backdrop:bg-black/40"
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[min(90vh,40rem)] flex-col">
        <div className="border-b border-[var(--gray-100)] px-6 py-4">
          <h2 id={titleId} className="text-[20px] font-semibold text-[var(--gray-900)]">
            Print receipt
          </h2>
          <p className="mt-1 text-[15px] text-[var(--gray-600)]">
            Choose a payment and paper width, then print to your thermal or POS printer.
          </p>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Payment</span>
            <select
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {invoice.payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {paymentSelectLabel(p)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[15px] font-medium text-[var(--gray-800)]">Paper width</legend>
            <div className="flex gap-2">
              {(["80mm", "58mm"] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setPaperWidth(width)}
                  className={`min-h-11 flex-1 rounded-[var(--radius-sm)] border px-3 text-[15px] font-semibold transition ${
                    paperWidth === width
                      ? "border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-800)]"
                      : "border-[var(--gray-200)] bg-[var(--white)] text-[var(--gray-800)] hover:bg-[var(--gray-50)]"
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--gray-50)] py-4">
            <style dangerouslySetInnerHTML={{ __html: thermalReceiptCss(paperWidth) }} />
            {receiptData ? (
              <AdmissionFeeReceipt id={receiptDomId} data={receiptData} paperWidth={paperWidth} />
            ) : (
              <p className="px-4 text-center text-[15px] text-[var(--gray-600)]">
                Select a payment to preview the receipt.
              </p>
            )}
          </div>

          {printError ? (
            <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
              {printError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--gray-100)] px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onPrint}
            loading={printing}
            disabled={!receiptData}
            className="inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </Button>
        </div>
      </div>
    </dialog>
  );
}
