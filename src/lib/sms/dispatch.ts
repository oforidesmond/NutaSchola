import type { NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/errors/logger";
import { normalizeGhPhone } from "@/lib/sms/phone";
import { sendSms } from "@/lib/sms/send";

export type DispatchSmsInput = {
  schoolId: string;
  enableSmsNotifications: boolean;
  /** Raw phone as stored; will be normalized. */
  phone: string | null | undefined;
  body: string;
  announcementId?: string | null;
};

export type DispatchSmsResult =
  | { status: "skipped"; reason: "disabled" | "no_phone" | "invalid_phone" }
  | { status: "sent"; phone: string }
  | { status: "failed"; phone: string | null; error: string };

async function writeLog(input: {
  schoolId: string;
  phone: string | null;
  body: string;
  status: NotificationStatus;
  announcementId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        schoolId: input.schoolId,
        recipientPhone: input.phone,
        channel: "SMS",
        status: input.status,
        body: input.body,
        announcementId: input.announcementId ?? null,
        errorMessage: input.errorMessage ?? null,
        sentAt: input.status === "SENT" ? new Date() : null,
      },
    });
  } catch (error) {
    logger.error("sms.log_failed", {
      schoolId: input.schoolId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Gate on school SMS setting, normalize phone, send, and write NotificationLog.
 * Never throws — safe to call from payment/stage workflows.
 */
export async function dispatchSms(input: DispatchSmsInput): Promise<DispatchSmsResult> {
  if (!input.enableSmsNotifications) {
    return { status: "skipped", reason: "disabled" };
  }
  if (!input.phone?.trim()) {
    return { status: "skipped", reason: "no_phone" };
  }

  const phone = normalizeGhPhone(input.phone);
  if (!phone) {
    await writeLog({
      schoolId: input.schoolId,
      phone: input.phone.trim(),
      body: input.body,
      status: "FAILED",
      announcementId: input.announcementId,
      errorMessage: "Invalid phone number",
    });
    return { status: "skipped", reason: "invalid_phone" };
  }

  try {
    await sendSms({ to: phone, body: input.body });
    await writeLog({
      schoolId: input.schoolId,
      phone,
      body: input.body,
      status: "SENT",
      announcementId: input.announcementId,
    });
    return { status: "sent", phone };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("sms.dispatch_failed", {
      schoolId: input.schoolId,
      phone,
      error: message,
    });
    await writeLog({
      schoolId: input.schoolId,
      phone,
      body: input.body,
      status: "FAILED",
      announcementId: input.announcementId,
      errorMessage: message.slice(0, 500),
    });
    return { status: "failed", phone, error: message };
  }
}
