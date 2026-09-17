"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import {
  commitExistingStudentImportAction,
  previewExistingStudentImportAction,
  type ImportPreviewRow,
} from "./actions";

export function ImportClient() {
  const [rows, setRows] = useState<ImportPreviewRow[] | null>(null);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    converted: number;
    skipped: number;
    summaryCsv: string;
  } | null>(null);

  async function onPreview(formData: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await previewExistingStudentImportAction(formData);
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setRows(res.data.rows);
    setConfirmDuplicates(false);
  }

  async function onCommit() {
    if (!rows) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(rows));
    formData.set("confirmDuplicates", confirmDuplicates ? "true" : "false");
    const res = await commitExistingStudentImportAction(formData);
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    setResult(res.data);
  }

  function downloadSummary() {
    if (!result) return;
    const blob = new Blob([result.summaryCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const validCount = rows?.filter((r) => r.errors.length === 0).length ?? 0;
  const invalidCount = rows?.filter((r) => r.errors.length > 0).length ?? 0;
  const dupeCount = rows?.filter((r) => r.duplicate).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">1. Template</h2>
        <p className="mt-2 text-[15px] text-[var(--gray-600)]">
          Download the Excel template, fill one row per student, then upload below.
        </p>
        <a
          href="/api/admissions/import/template"
          className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--brand-600)] px-4 text-[15px] font-medium text-white hover:bg-[var(--brand-700)]"
        >
          Download .xlsx template
        </a>
      </section>

      <section className="surface-raised p-6">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">2. Upload & preview</h2>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onPreview(new FormData(e.currentTarget));
          }}
        >
          <input
            type="file"
            name="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="text-[15px]"
          />
          <Button type="submit" loading={loading} className="self-start">
            Parse & preview
          </Button>
        </form>
        {error ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
            {error}
          </p>
        ) : null}
      </section>

      {rows ? (
        <section className="surface-raised p-6">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">3. Preview</h2>
          <p className="mt-2 text-[15px] text-[var(--gray-600)]">
            {validCount} valid · {invalidCount} invalid · {dupeCount} duplicate-flagged
          </p>
          <div className="mt-4 max-h-[420px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--gray-100)] text-[12px] uppercase text-[var(--gray-500)]">
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Class</th>
                  <th className="px-2 py-2">Waived</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className="border-b border-[var(--gray-50)]">
                    <td className="px-2 py-2">{r.rowNumber}</td>
                    <td className="px-2 py-2">{r.studentName}</td>
                    <td className="px-2 py-2">{r.classLevelName}</td>
                    <td className="px-2 py-2">{r.admissionFeeWaived ? "Y" : "N"}</td>
                    <td className="px-2 py-2">
                      {r.errors.length > 0 ? (
                        <span className="text-[var(--error-700)]">{r.errors.join("; ")}</span>
                      ) : r.duplicate ? (
                        <span className="text-[#8a4a0c]">{r.duplicateReason}</span>
                      ) : (
                        <span className="text-[var(--success-700)]">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dupeCount > 0 ? (
            <label className="mt-4 flex items-start gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={confirmDuplicates}
                onChange={(e) => setConfirmDuplicates(e.target.checked)}
                className="mt-1"
              />
              <span>
                I confirm duplicate-flagged rows should still be imported (do not silently skip).
              </span>
            </label>
          ) : null}

          <Button
            type="button"
            className="mt-4 self-start"
            loading={loading}
            onClick={() => void onCommit()}
            disabled={validCount === 0}
          >
            Convert all valid rows
          </Button>
        </section>
      ) : null}

      {result ? (
        <section className="surface-raised p-6">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">4. Summary</h2>
          <p className="mt-2 text-[15px] text-[var(--gray-700)]">
            Created {result.created} · Converted {result.converted} · Skipped {result.skipped}
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={downloadSummary}>
            Download CSV summary
          </Button>
        </section>
      ) : null}
    </div>
  );
}
