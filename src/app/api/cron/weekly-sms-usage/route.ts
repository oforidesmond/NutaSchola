import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/errors/logger";
import { canUseEbits, normalizeGhPhone, sendSms } from "@/lib/sms";

/** Product owner — weekly SMS usage digest. */
const DIGEST_PHONE = "0541298861";

/**
 * Vercel Cron: every Sunday 18:00 UTC (Accra).
 * Counts SENT SMS in the last 7 days and texts the digest phone.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const sentCount = await prisma.notificationLog.count({
      where: {
        channel: "SMS",
        status: "SENT",
        OR: [
          { sentAt: { gte: weekAgo } },
          { sentAt: null, createdAt: { gte: weekAgo } },
        ],
      },
    });

    const body = `NutaSchola: ${sentCount} SMS sent in the last 7 days.`;

    if (!canUseEbits()) {
      logger.warn("cron.weekly_sms_usage.noop", { sentCount });
      return Response.json({
        ok: true,
        sentCount,
        delivered: false,
        reason: "SMS_PROVIDER_NOOP",
      });
    }

    const phone = normalizeGhPhone(DIGEST_PHONE);
    if (!phone) {
      logger.error("cron.weekly_sms_usage.invalid_phone", { DIGEST_PHONE });
      return Response.json({ ok: false, error: "Invalid digest phone" }, { status: 500 });
    }

    await sendSms({ to: phone, body });

    logger.info("cron.weekly_sms_usage.sent", { sentCount, to: phone });
    return Response.json({ ok: true, sentCount, delivered: true });
  } catch (error) {
    logger.error("cron.weekly_sms_usage.failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}
