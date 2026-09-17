import { sendEmail } from "@/lib/mail";
import { logger } from "@/lib/errors/logger";
import { dispatchSms } from "@/lib/sms";

type GuardianContact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
} | null;

export async function notifyStationerySale(input: {
  schoolId: string;
  schoolName: string;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  guardian: GuardianContact;
  studentName: string;
  amountPaid: string;
  receiptNumber: string;
  methodLabel: string;
}): Promise<void> {
  if (!input.guardian) return;

  if (input.enableEmailNotifications && input.guardian.email) {
    const subject = `${input.schoolName}: Stationery receipt ${input.receiptNumber}`;
    const text = [
      `Dear ${input.guardian.firstName},`,
      ``,
      `Stationery purchase for ${input.studentName}: GHS ${input.amountPaid} (${input.methodLabel}).`,
      `Receipt: ${input.receiptNumber}`,
      ``,
      `Thank you.`,
      input.schoolName,
    ].join("\n");
    try {
      await sendEmail({
        to: input.guardian.email,
        subject,
        text,
        html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
      });
    } catch (error) {
      logger.error("sales.notify_email_failed", {
        error: error instanceof Error ? error.message : String(error),
        receiptNumber: input.receiptNumber,
      });
    }
  }

  if (input.guardian.phone) {
    await dispatchSms({
      schoolId: input.schoolId,
      enableSmsNotifications: input.enableSmsNotifications,
      phone: input.guardian.phone,
      body: `${input.schoolName}: Stationery GHS ${input.amountPaid} for ${input.studentName}. Receipt ${input.receiptNumber}.`,
    });
  }
}
