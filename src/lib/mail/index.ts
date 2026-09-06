import { logger } from "@/lib/errors/logger";
import { sendViaDevLog } from "@/lib/mail/providers/dev-log";
import { canUseSmtp, sendViaSmtp } from "@/lib/mail/providers/smtp";
import type { OutboundEmail } from "@/lib/mail/types";

export type { OutboundEmail, EmailContent } from "@/lib/mail/types";
export {
  inviteEmail,
  passwordResetEmail,
  admissionStatusEmail,
} from "@/lib/mail/templates";
export { appBaseUrl } from "@/lib/mail/templates/shell";

/**
 * Send transactional email via SMTP when configured; otherwise log to console.
 * Callers never need to know which provider ran.
 */
export async function sendEmail(message: OutboundEmail): Promise<void> {
  if (canUseSmtp()) {
    try {
      await sendViaSmtp(message);
      return;
    } catch (error) {
      logger.error("mail.smtp_failed", {
        to: message.to,
        subject: message.subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  await sendViaDevLog(message);
}
