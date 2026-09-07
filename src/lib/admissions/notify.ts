import type { AdmissionStage } from "@prisma/client";
import { sendEmail, admissionStatusEmail } from "@/lib/mail";
import { admissionStageLabel } from "@/lib/admissions/stages";
import { logger } from "@/lib/errors/logger";
import {
  admissionStageSms,
  admissionFeeDueSms,
  admissionFeePaymentSms,
  admissionFeeArrearsSms,
  dispatchSms,
} from "@/lib/sms";

type GuardianContact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
} | null;

/**
 * Emails and/or texts the primary guardian on a stage change.
 * Never throws — notification failure must never block a stage change.
 */
export async function notifyStageChange(input: {
  schoolId: string;
  schoolName: string;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  applicantName: string;
  applicationNumber: string;
  stage: AdmissionStage;
  guardian: GuardianContact;
  note?: string | null;
}): Promise<void> {
  if (input.enableEmailNotifications && input.guardian?.email) {
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
      logger.error("admissions.notify_email_failed", {
        error: error instanceof Error ? error.message : String(error),
        applicationNumber: input.applicationNumber,
      });
    }
  }

  if (input.guardian?.phone) {
    await dispatchSms({
      schoolId: input.schoolId,
      enableSmsNotifications: input.enableSmsNotifications,
      phone: input.guardian.phone,
      body: admissionStageSms({
        schoolName: input.schoolName,
        guardianFirstName: input.guardian.firstName,
        applicantName: input.applicantName,
        applicationNumber: input.applicationNumber,
        stageLabel: admissionStageLabel(input.stage),
      }),
    });
  }
}

export async function notifyAdmissionFeeDue(input: {
  schoolId: string;
  schoolName: string;
  enableSmsNotifications: boolean;
  guardian: GuardianContact;
  applicantName: string;
  amountDue: string | number;
}): Promise<void> {
  if (!input.guardian?.phone) return;
  await dispatchSms({
    schoolId: input.schoolId,
    enableSmsNotifications: input.enableSmsNotifications,
    phone: input.guardian.phone,
    body: admissionFeeDueSms({
      schoolName: input.schoolName,
      guardianFirstName: input.guardian.firstName,
      applicantName: input.applicantName,
      amountDue: input.amountDue,
    }),
  });
}

export async function notifyAdmissionFeePayment(input: {
  schoolId: string;
  schoolName: string;
  enableSmsNotifications: boolean;
  guardian: GuardianContact;
  applicantName: string;
  amountPaid: string | number;
  methodLabel: string;
  outstanding: string | number;
}): Promise<void> {
  if (!input.guardian?.phone) return;
  await dispatchSms({
    schoolId: input.schoolId,
    enableSmsNotifications: input.enableSmsNotifications,
    phone: input.guardian.phone,
    body: admissionFeePaymentSms({
      schoolName: input.schoolName,
      guardianFirstName: input.guardian.firstName,
      applicantName: input.applicantName,
      amountPaid: input.amountPaid,
      methodLabel: input.methodLabel,
      outstanding: input.outstanding,
    }),
  });
}

export async function notifyAdmissionFeeArrears(input: {
  schoolId: string;
  schoolName: string;
  enableSmsNotifications: boolean;
  guardian: GuardianContact;
  applicantName: string;
  outstanding: string | number;
}): Promise<{ status: "sent" | "failed" | "skipped"; reason?: string }> {
  if (!input.guardian?.phone) return { status: "skipped", reason: "no_phone" };
  const result = await dispatchSms({
    schoolId: input.schoolId,
    enableSmsNotifications: input.enableSmsNotifications,
    phone: input.guardian.phone,
    body: admissionFeeArrearsSms({
      schoolName: input.schoolName,
      guardianFirstName: input.guardian.firstName,
      applicantName: input.applicantName,
      outstanding: input.outstanding,
    }),
  });
  if (result.status === "sent") return { status: "sent" };
  if (result.status === "failed") return { status: "failed", reason: result.error };
  return { status: "skipped", reason: result.reason };
}
