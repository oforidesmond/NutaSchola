"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/errors/logger";
import { chunkArray, resolveGuardianSmsRecipients } from "@/lib/communications/recipients";
import { dispatchSms, normalizeGhPhone, sendSms } from "@/lib/sms";

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

function toFailArgs(error: unknown): [string, string, Record<string, string[]>?] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message, actionError.fieldErrors];
}

const composeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Message is required").max(640),
  audience: z.enum(["all_primary", "class"]),
  classLevelId: z.string().optional(),
});

/**
 * Create an Announcement and SMS its audience. Batches provider calls (~50 recipients).
 */
export async function composeGuardianSmsAction(
  formData: FormData,
): Promise<ActionResult<{ sent: number; failed: number; recipientCount: number }>> {
  try {
    const { tenant, user } = await requireAction(ACTIONS.COMMUNICATIONS_SEND);
    const parsed = composeSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body"),
      audience: formData.get("audience"),
      classLevelId: formData.get("classLevelId") || undefined,
    });
    if (!parsed.success) {
      return fail(
        "VALIDATION_ERROR",
        "Please fix the highlighted fields.",
        fieldErrorsFromZod(parsed.error),
      );
    }

    if (parsed.data.audience === "class" && !parsed.data.classLevelId) {
      return fail("VALIDATION_ERROR", "Select a class for this audience.", {
        classLevelId: ["Select a class."],
      });
    }

    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: tenant.schoolId },
    });
    if (!settings?.enableSmsNotifications) {
      return fail(
        "SMS_DISABLED",
        "SMS notifications are disabled for this school. Enable them in School settings.",
      );
    }

    if (parsed.data.classLevelId) {
      const classLevel = await prisma.classLevel.findFirst({
        where: { id: parsed.data.classLevelId, schoolId: tenant.schoolId },
      });
      if (!classLevel) {
        return fail("NOT_FOUND", "Class not found.");
      }
    }

    const recipients = await resolveGuardianSmsRecipients({
      schoolId: tenant.schoolId,
      audience: parsed.data.audience,
      classLevelId: parsed.data.classLevelId,
    });

    if (recipients.length === 0) {
      return fail("NO_RECIPIENTS", "No guardian phone numbers matched this audience.");
    }

    const announcement = await prisma.announcement.create({
      data: {
        schoolId: tenant.schoolId,
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience === "class" ? "SPECIFIC_CLASS" : "PARENTS",
        classLevelId: parsed.data.audience === "class" ? parsed.data.classLevelId : null,
        createdById: user.id,
        publishedAt: new Date(),
      },
    });

    const smsBody = `${tenant.school.name}: ${parsed.data.body}`;
    let sent = 0;
    let failed = 0;

    // Prefer batched provider calls; fall back to per-recipient dispatch if batch fails.
    const chunks = chunkArray(recipients, 50);
    for (const chunk of chunks) {
      const normalized = chunk
        .map((r) => ({ ...r, normalized: normalizeGhPhone(r.phone) }))
        .filter((r): r is typeof r & { normalized: string } => Boolean(r.normalized));

      const invalid = chunk.length - normalized.length;
      failed += invalid;
      for (const bad of chunk.filter((r) => !normalizeGhPhone(r.phone))) {
        await dispatchSms({
          schoolId: tenant.schoolId,
          enableSmsNotifications: true,
          phone: bad.phone,
          body: smsBody,
          announcementId: announcement.id,
        });
      }

      if (normalized.length === 0) continue;

      try {
        await sendSms({
          to: normalized.map((r) => r.normalized),
          body: smsBody,
        });
        await prisma.notificationLog.createMany({
          data: normalized.map((r) => ({
            schoolId: tenant.schoolId,
            announcementId: announcement.id,
            recipientPhone: r.normalized,
            channel: "SMS" as const,
            status: "SENT" as const,
            body: smsBody,
            sentAt: new Date(),
          })),
        });
        sent += normalized.length;
      } catch (error) {
        logger.error("communications.batch_sms_failed", {
          error: error instanceof Error ? error.message : String(error),
          count: normalized.length,
        });
        for (const r of normalized) {
          const result = await dispatchSms({
            schoolId: tenant.schoolId,
            enableSmsNotifications: true,
            phone: r.phone,
            body: smsBody,
            announcementId: announcement.id,
          });
          if (result.status === "sent") sent += 1;
          else failed += 1;
        }
      }
    }

    revalidatePath("/communications");
    return ok({ sent, failed, recipientCount: recipients.length });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
