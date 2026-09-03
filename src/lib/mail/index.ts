import { logger } from "@/lib/errors/logger";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Local/dev mailer — logs instead of sending.
 * Swap for a real provider (Resend, SES, etc.) when SMTP credentials exist.
 */
export async function sendEmail(message: OutboundEmail): Promise<void> {
  logger.info("mail.dev_log", {
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
