import { sendEmail } from "@/lib/mail";
import { logger } from "@/lib/errors/logger";
import { dispatchSms } from "@/lib/sms";

type GuardianContact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
} | null;

function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

export async function notifySchoolFeePayment(input: {
  schoolId: string;
  schoolName: string;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  guardian: GuardianContact;
  studentName: string;
  amountPaid: string | number;
  methodLabel: string;
  outstanding: string | number;
  receiptNumber: string;
}): Promise<void> {
  const amount = formatMoney(input.amountPaid);
  const outstanding = formatMoney(input.outstanding);

  if (input.enableEmailNotifications && input.guardian?.email) {
    const subject = `${input.schoolName}: School fees payment received`;
    const text = [
      `Dear ${input.guardian.firstName},`,
      ``,
      `We received a school fees payment of GHS ${amount} (${input.methodLabel}) for ${input.studentName}.`,
      `Receipt: ${input.receiptNumber}`,
      `Outstanding balance: GHS ${outstanding}`,
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
      logger.error("fees.notify_email_failed", {
        error: error instanceof Error ? error.message : String(error),
        receiptNumber: input.receiptNumber,
      });
    }
  }

  if (input.guardian?.phone) {
    await dispatchSms({
      schoolId: input.schoolId,
      enableSmsNotifications: input.enableSmsNotifications,
      phone: input.guardian.phone,
      body: `${input.schoolName}: Received GHS ${amount} school fees for ${input.studentName} (${input.methodLabel}). Receipt ${input.receiptNumber}. Balance GHS ${outstanding}.`,
    });
  }
}
