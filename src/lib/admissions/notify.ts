import type { AdmissionStage } from "@prisma/client";
import { sendEmail, admissionStatusEmail } from "@/lib/mail";
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
  const content = admissionStatusEmail({
    schoolName: input.schoolName,
    guardianFirstName: input.guardian.firstName,
    guardianLastName: input.guardian.lastName,
    applicantName: input.applicantName,
    applicationNumber: input.applicationNumber,
    stageLabel,
    note: input.note,
  });

  try {
    await sendEmail({
      to: input.guardian.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } catch (error) {
    logger.error("admissions.notify_failed", {
      error: error instanceof Error ? error.message : String(error),
      applicationNumber: input.applicationNumber,
    });
  }
}
