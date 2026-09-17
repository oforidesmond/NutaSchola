import ExcelJS from "exceljs";
import { Gender } from "@prisma/client";
import { normalizeGhPhone } from "@/lib/sms/phone";

export const IMPORT_HEADERS = [
  "studentName",
  "dateOfBirth",
  "gender",
  "classLevel",
  "guardianName",
  "guardianPhone",
  "guardianEmail",
  "admissionFeeWaived",
  "waiverReason",
] as const;

export type ImportHeader = (typeof IMPORT_HEADERS)[number];

export type ParsedImportRow = {
  rowNumber: number;
  studentName: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  classLevelName: string;
  classLevelId: string | null;
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  admissionFeeWaived: boolean;
  waiverReason: string | null;
  errors: string[];
  duplicate: boolean;
  duplicateReason: string | null;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function parseName(full: string): { firstName: string; lastName: string; middleName: string | null } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "", middleName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0], middleName: null };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1], middleName: null };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function parseDob(raw: string): string | null {
  if (!raw) return null;
  // Excel serial date sometimes comes as number string
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    // Excel epoch 1899-12-30
    const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function parseGender(raw: string): Gender | null {
  const v = raw.trim().toUpperCase();
  if (v === "M" || v === "MALE" || v === "BOY") return Gender.MALE;
  if (v === "F" || v === "FEMALE" || v === "GIRL") return Gender.FEMALE;
  return null;
}

function parseYesNo(raw: string): boolean {
  const v = raw.trim().toUpperCase();
  return v === "Y" || v === "YES" || v === "TRUE" || v === "1";
}

export async function buildImportTemplateBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Existing students");
  ws.addRow([...IMPORT_HEADERS]);
  ws.getRow(1).font = { bold: true };
  ws.addRow([
    "Ama Mensah",
    "2018-05-12",
    "FEMALE",
    "Primary 1",
    "Kofi Mensah",
    "0244123456",
    "kofi@example.com",
    "Y",
    "Existing student",
  ]);
  ws.columns = IMPORT_HEADERS.map(() => ({ width: 18 }));
  // Keep phone column as text so Excel does not strip leading zeros.
  const phoneCol = IMPORT_HEADERS.indexOf("guardianPhone") + 1;
  ws.getColumn(phoneCol).numFmt = "@";
  ws.getCell(2, phoneCol).numFmt = "@";
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function parseImportWorkbook(
  buffer: Buffer,
  classLevels: { id: string; name: string }[],
): Promise<ParsedImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headerMap = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    headerMap.set(cellText(cell.value).toLowerCase(), col);
  });

  const levelByName = new Map(
    classLevels.map((l) => [l.name.trim().toLowerCase(), l]),
  );

  const rows: ParsedImportRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (key: ImportHeader) => {
      const col = headerMap.get(key.toLowerCase());
      if (!col) return "";
      return cellText(row.getCell(col).value);
    };

    const studentName = get("studentName");
    const dobRaw = get("dateOfBirth");
    const genderRaw = get("gender");
    const classLevelName = get("classLevel");
    const guardianName = get("guardianName");
    const guardianPhoneRaw = get("guardianPhone");
    const guardianEmailRaw = get("guardianEmail");
    const waivedRaw = get("admissionFeeWaived");
    const waiverReason = get("waiverReason") || null;

    const errors: string[] = [];
    const { firstName, lastName, middleName } = parseName(studentName);
    if (!studentName) errors.push("Student name is required");

    const dateOfBirth = parseDob(dobRaw);
    if (!dateOfBirth) errors.push("Invalid or missing date of birth");

    const gender = parseGender(genderRaw);
    if (!gender) errors.push("Gender must be MALE or FEMALE");

    const level = levelByName.get(classLevelName.trim().toLowerCase());
    if (!classLevelName) errors.push("Class level is required");
    else if (!level) errors.push(`Unknown class level: ${classLevelName}`);

    const gName = parseName(guardianName);
    if (!guardianName) errors.push("Guardian name is required");

    const phone = normalizeGhPhone(guardianPhoneRaw);
    if (!guardianPhoneRaw) errors.push("Guardian phone is required");
    else if (!phone) errors.push("Invalid Ghana phone number");

    let guardianEmail: string | null = guardianEmailRaw || null;
    if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      errors.push("Invalid guardian email");
      guardianEmail = null;
    }

    const admissionFeeWaived = waivedRaw ? parseYesNo(waivedRaw) : true;

    rows.push({
      rowNumber,
      studentName,
      firstName,
      lastName,
      middleName,
      dateOfBirth: dateOfBirth ?? "",
      gender: gender ?? Gender.MALE,
      classLevelName,
      classLevelId: level?.id ?? null,
      guardianFirstName: gName.firstName,
      guardianLastName: gName.lastName,
      guardianPhone: phone ?? guardianPhoneRaw,
      guardianEmail,
      admissionFeeWaived,
      waiverReason: admissionFeeWaived ? waiverReason : null,
      errors,
      duplicate: false,
      duplicateReason: null,
    });
  });

  return rows;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
