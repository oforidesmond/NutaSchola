import { logger } from "@/lib/errors/logger";
import { sendViaEbits, canUseEbits } from "@/lib/sms/providers/ebits";
import { sendViaNoop } from "@/lib/sms/providers/noop";
import type { OutboundSms } from "@/lib/sms/types";

/**
 * Send SMS via ebits when configured; otherwise log to console (noop).
 * Callers that must not block workflows should use `dispatchSms` instead.
 */
export async function sendSms(message: OutboundSms): Promise<void> {
  if (canUseEbits()) {
    try {
      await sendViaEbits(message);
      return;
    } catch (error) {
      logger.error("sms.ebits_failed", {
        to: message.to,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  await sendViaNoop(message);
}
