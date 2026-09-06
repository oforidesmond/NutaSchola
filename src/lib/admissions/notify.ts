import type { AdmissionStage } from "@prisma/client";
import { sendEmail } from "@/lib/mail";
import { admissionStageLabel } from "@/lib/admissions/stages";
import { logger } from "@/lib/errors/logger";

type PrimaryGuardianContact = {
  firstName: string;
  lastName: string;
  email: string | null;
} | null;

/**
 * Emails the primary guardian on a stage change, gated on
 * `SchoolSettings.enableEmailNotifications` and a guardian email on file.
 * Never throws — a notification failure must never block a stage change or
 * conversion, so failures are logged and swallowed.
 */
export async function notifyStageChange(input: {
  schoolName: string;
  enableEmailNotifications: boolean;
  applicantName: string;
  applicationNumber: string;
  stage: AdmissionStage;
  guardian: PrimaryGuardianContact;
  note?: string | null;
}): Promise<void> {
  if (!input.enableEmailNotifications) return;
  if (!input.guardian?.email) return;

  const stageLabel = admissionStageLabel(input.stage);
  const lines = [
    `Dear ${input.guardian.firstName} ${input.guardian.lastName},`,
    "",
    `The admission application ${input.applicationNumber} for ${input.applicantName} has moved to: ${stageLabel}.`,
  ];
  if (input.note) lines.push("", `Note: ${input.note}`);
  lines.push("", `— ${input.schoolName} Admissions`);

  try {
    await sendEmail({
      to: input.guardian.email,
      subject: `${input.schoolName} admissions update — ${stageLabel}`,
      text: lines.join("\n"),
    });
  } catch (error) {
    logger.error("admissions.notify_failed", {
      error: error instanceof Error ? error.message : String(error),
      applicationNumber: input.applicationNumber,
    });
  }
}
