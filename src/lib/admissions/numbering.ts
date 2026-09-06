import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

function pad(seq: number, width = 4): string {
  return String(Math.max(seq, 0)).padStart(width, "0");
}

/**
 * Atomically increments SchoolSettings.applicationNumberNextSeq and returns a
 * formatted application number: `${prefix}-${year}-${paddedSeq}` (e.g.
 * `APP-2026-0001`). Must run inside the same transaction as the
 * AdmissionApplication create so the sequence and the record stay in sync —
 * uniqueness is additionally enforced by the `[schoolId, applicationNumber]`
 * constraint on AdmissionApplication.
 */
export async function nextApplicationNumber(tx: Tx, schoolId: string): Promise<string> {
  const settings = await tx.schoolSettings.update({
    where: { schoolId },
    data: { applicationNumberNextSeq: { increment: 1 } },
    select: { applicationNumberPrefix: true, applicationNumberNextSeq: true },
  });
  const seq = settings.applicationNumberNextSeq - 1;
  const year = new Date().getFullYear();
  return `${settings.applicationNumberPrefix}-${year}-${pad(seq)}`;
}

/**
 * Atomically increments SchoolSettings.admissionNumberNextSeq and returns a
 * formatted admission number for a newly converted Student. Must run inside
 * the same transaction as the conversion.
 */
export async function nextAdmissionNumber(tx: Tx, schoolId: string): Promise<string> {
  const settings = await tx.schoolSettings.update({
    where: { schoolId },
    data: { admissionNumberNextSeq: { increment: 1 } },
    select: { admissionNumberPrefix: true, admissionNumberNextSeq: true },
  });
  const seq = settings.admissionNumberNextSeq - 1;
  const year = new Date().getFullYear();
  return `${settings.admissionNumberPrefix}-${year}-${pad(seq)}`;
}
