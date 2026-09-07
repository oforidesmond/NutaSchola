import type { OutboundSms } from "@/lib/sms/types";

function ebitsConfigured(): boolean {
  return Boolean(
    process.env.EBITS_SMS_API_KEY?.trim() &&
      process.env.EBITS_SMS_BASE_URL?.trim() &&
      process.env.EBITS_SMS_SENDER_ID?.trim(),
  );
}

export function canUseEbits(): boolean {
  const provider = (process.env.SMS_PROVIDER ?? "noop").toLowerCase();
  return provider === "ebits" && ebitsConfigured();
}

type EbitsSendResponse = {
  status?: string;
  message?: string;
  data?: unknown;
};

/**
 * Send via ebits (Arkesel-compatible) SMS API.
 * POST {base}/api/v2/sms/send with api-key header.
 */
export async function sendViaEbits(message: OutboundSms): Promise<void> {
  const baseUrl = process.env.EBITS_SMS_BASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.EBITS_SMS_API_KEY!;
  const sender = process.env.EBITS_SMS_SENDER_ID!;
  const recipients = Array.isArray(message.to) ? message.to : [message.to];

  if (recipients.length === 0) {
    throw new Error("No SMS recipients provided.");
  }

  const response = await fetch(`${baseUrl}/api/v2/sms/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      message: message.body,
      recipients,
    }),
  });

  const text = await response.text();
  let payload: EbitsSendResponse | null = null;
  try {
    payload = text ? (JSON.parse(text) as EbitsSendResponse) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `ebits SMS failed with HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  if (payload?.status && payload.status.toLowerCase() !== "success") {
    throw new Error(payload.message || `ebits SMS rejected: ${payload.status}`);
  }
}
