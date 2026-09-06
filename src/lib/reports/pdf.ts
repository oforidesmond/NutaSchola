import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import { brand } from "@/config/brand";
import { formatDateAccra } from "@/lib/format/currency";
import type { ReportColumn, ReportSchoolBrand, CsvRow } from "./types";

function logoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", brand.logo.pngWhiteBg.replace(/^\//, "")),
    path.join(process.cwd(), "public", brand.logo.pngTransparent.replace(/^\//, "")),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function schoolAddressLine(school: ReportSchoolBrand): string {
  return [school.address, school.city, school.region].filter(Boolean).join(", ");
}

export async function buildBrandedPdf(options: {
  school: ReportSchoolBrand;
  title: string;
  subtitle?: string;
  columns?: ReportColumn[];
  rows?: CsvRow[];
  sections?: { heading: string; lines: string[] }[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const logo = logoPath();
  if (logo) {
    doc.image(logo, 48, 40, { width: 120 });
    doc.y = 110;
  } else {
    doc
      .font("Times-Bold")
      .fontSize(18)
      .fillColor("#0C6C9C")
      .text(brand.productName, { align: "left" });
    doc.moveDown(0.5);
  }

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111827").text(options.school.name);

  const address = schoolAddressLine(options.school);
  if (address) {
    doc.font("Helvetica").fontSize(10).fillColor("#4B5563").text(address);
  }
  const contacts = [options.school.contactPhone, options.school.contactEmail]
    .filter(Boolean)
    .join(" · ");
  if (contacts) {
    doc.font("Helvetica").fontSize(10).fillColor("#4B5563").text(contacts);
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text(options.title);
  if (options.subtitle) {
    doc.font("Helvetica").fontSize(11).fillColor("#4B5563").text(options.subtitle);
  }
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6B7280")
    .text(`Generated ${formatDateAccra(new Date())}`);

  doc.moveDown(1);

  if (options.sections) {
    for (const section of options.sections) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text(section.heading);
      doc.moveDown(0.3);
      for (const line of section.lines) {
        doc.font("Helvetica").fontSize(10).fillColor("#374151").text(line);
      }
      doc.moveDown(0.8);
    }
  }

  if (options.columns && options.rows) {
    drawSimpleTable(doc, options.columns, options.rows);
  }

  doc.end();
  return bufferPromise;
}

/** One row per line as "Header: value | Header: value" — reliable for print folders. */
function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  columns: ReportColumn[],
  rows: CsvRow[],
): void {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#6B7280");
  doc.text(columns.map((c) => c.header).join("  |  "));
  doc.moveDown(0.4);
  doc.strokeColor("#E5E7EB").moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.5);

  for (const row of rows) {
    if (doc.y > doc.page.height - 72) {
      doc.addPage();
    }
    const line = columns
      .map((col) => {
        const val = row[col.key] == null ? "—" : String(row[col.key]);
        return val;
      })
      .join("  |  ");
    doc.font("Helvetica").fontSize(9).fillColor("#374151").text(line, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
    doc.moveDown(0.35);
  }
}

export function pdfDownloadResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
