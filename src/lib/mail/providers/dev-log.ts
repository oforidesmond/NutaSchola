import { logger } from "@/lib/errors/logger";
import type { OutboundEmail } from "@/lib/mail/types";

/**
 * Local/dev mailer — logs instead of sending.
 * Used when SMTP credentials are absent or EMAIL_PROVIDER is not smtp.
 */
export async function sendViaDevLog(message: OutboundEmail): Promise<void> {
  logger.info("mail.dev_log", {
    to: message.to,
    subject: message.subject,
    text: message.text,
    hasHtml: Boolean(message.html),
  });
}
