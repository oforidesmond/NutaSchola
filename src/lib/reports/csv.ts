import type { CsvRow, ReportColumn } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv<T extends string>(
  columns: ReportColumn<T>[],
  rows: CsvRow[],
): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        if (raw === null || raw === undefined) return "";
        return escapeCsvCell(String(raw));
      })
      .join(","),
  );
  return [header, ...body].join("\r\n") + "\r\n";
}

export function csvDownloadResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
