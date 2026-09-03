"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { fail, ok, toActionError, type ActionResult } from "@/lib/errors";

const schema = z.object({
  name: z.string().min(2, "School name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  admissionNumberPrefix: z.string().min(1, "Admission prefix is required"),
  applicationNumberPrefix: z.string().min(1, "Application prefix is required"),
  enableOnlineApplication: z.coerce.boolean(),
  enableSmsNotifications: z.coerce.boolean(),
  enableEmailNotifications: z.coerce.boolean(),
});

export async function updateSchoolSettings(
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.SCHOOL_SETTINGS_UPDATE);

    const parsed = schema.safeParse({
      name: formData.get("name"),
      address: formData.get("address") || undefined,
      city: formData.get("city") || undefined,
      region: formData.get("region") || undefined,
      contactEmail: formData.get("contactEmail") || "",
      contactPhone: formData.get("contactPhone") || undefined,
      admissionNumberPrefix: formData.get("admissionNumberPrefix"),
      applicationNumberPrefix: formData.get("applicationNumberPrefix"),
      enableOnlineApplication: formData.get("enableOnlineApplication") === "on",
      enableSmsNotifications: formData.get("enableSmsNotifications") === "on",
      enableEmailNotifications: formData.get("enableEmailNotifications") === "on",
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "form";
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      }
      return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
    }

    const data = parsed.data;

    await prisma.$transaction([
      prisma.school.update({
        where: { id: tenant.schoolId },
        data: {
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          region: data.region || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
        },
      }),
      prisma.schoolSettings.update({
        where: { schoolId: tenant.schoolId },
        data: {
          admissionNumberPrefix: data.admissionNumberPrefix,
          applicationNumberPrefix: data.applicationNumberPrefix,
          enableOnlineApplication: data.enableOnlineApplication,
          enableSmsNotifications: data.enableSmsNotifications,
          enableEmailNotifications: data.enableEmailNotifications,
        },
      }),
    ]);

    return ok({ saved: true });
  } catch (error) {
    const actionError = toActionError(error);
    return fail(actionError.code, actionError.message, actionError.fieldErrors);
  }
}
