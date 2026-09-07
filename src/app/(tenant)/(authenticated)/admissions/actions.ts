"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { feeOutstanding } from "@/lib/admissions/fees";
import { notifyAdmissionFeeArrears } from "@/lib/admissions/notify";
import { normalizeGhPhone } from "@/lib/sms";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFailArgs(error: unknown): [string, string] {
  const actionError = toActionError(error);
  return [actionError.code, actionError.message];
}

/**
 * Staff-triggered bulk SMS: one reminder per unique guardian phone for
 * applications with an outstanding admission fee balance.
 */
export async function sendBulkAdmissionFeeArrearsRemindersAction(): Promise<
  ActionResult<{ sent: number; skipped: number; failed: number }>
> {
  try {
    const { tenant } = await requireAction(ACTIONS.ADMISSIONS_FEES);

    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: tenant.schoolId },
    });
    if (!settings?.enableSmsNotifications) {
      return fail(
        "SMS_DISABLED",
        "SMS notifications are disabled for this school. Enable them in School settings.",
      );
    }

    const applications = await prisma.admissionApplication.findMany({
      where: {
        schoolId: tenant.schoolId,
        deletedAt: null,
        admissionFeeInvoiceId: { not: null },
      },
      include: {
        admissionFeeInvoice: true,
        guardians: {
          include: { guardian: true },
          orderBy: [{ isPrimaryContact: "desc" }, { id: "asc" }],
        },
      },
    });

    type Pending = {
      phone: string;
      guardianFirstName: string;
      guardianLastName: string;
      guardianEmail: string | null;
      applicantName: string;
      outstanding: string;
    };

    const byPhone = new Map<string, Pending>();

    for (const app of applications) {
      if (!app.admissionFeeInvoice) continue;
      const outstanding = feeOutstanding(app.admissionFeeInvoice);
      if (outstanding <= 0) continue;

      const link = app.guardians.find((g) => g.guardian.phone?.trim()) ?? null;
      if (!link) continue;

      const normalized = normalizeGhPhone(link.guardian.phone);
      if (!normalized) continue;
      if (byPhone.has(normalized)) continue;

      byPhone.set(normalized, {
        phone: link.guardian.phone,
        guardianFirstName: link.guardian.firstName,
        guardianLastName: link.guardian.lastName,
        guardianEmail: link.guardian.email,
        applicantName: `${app.firstName} ${app.lastName}`,
        outstanding: outstanding.toFixed(2),
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of byPhone.values()) {
      const result = await notifyAdmissionFeeArrears({
        schoolId: tenant.schoolId,
        schoolName: tenant.school.name,
        enableSmsNotifications: true,
        guardian: {
          firstName: item.guardianFirstName,
          lastName: item.guardianLastName,
          email: item.guardianEmail,
          phone: item.phone,
        },
        applicantName: item.applicantName,
        outstanding: item.outstanding,
      });

      if (result.status === "sent") sent += 1;
      else if (result.status === "failed") failed += 1;
      else skipped += 1;

      await sleep(120);
    }

    revalidatePath("/admissions");
    return ok({ sent, skipped, failed });
  } catch (error) {
    return fail(...toFailArgs(error));
  }
}
