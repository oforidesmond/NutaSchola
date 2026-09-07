import { logger } from "@/lib/errors/logger";
import type { OutboundSms } from "@/lib/sms/types";

/**
 * Local/dev SMS — logs instead of sending.
 * Used when SMS_PROVIDER is noop or ebits is not configured.
 */
export async function sendViaNoop(message: OutboundSms): Promise<void> {
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  logger.info("sms.noop", {
    to: recipients,
    body: message.body,
    recipientCount: recipients.length,
  });
}
