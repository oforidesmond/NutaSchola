import { prisma } from "@/lib/db/prisma";
import { uniqueNormalizedPhones } from "@/lib/sms/phone";

export type GuardianSmsRecipient = {
  phone: string;
  guardianId: string;
  firstName: string;
};

/**
 * Resolve unique guardian phones for a broadcast audience.
 * Prefers primary contacts; includes any guardian with a phone for the student/application.
 */
export async function resolveGuardianSmsRecipients(input: {
  schoolId: string;
  audience: "all_primary" | "class";
  classLevelId?: string | null;
}): Promise<GuardianSmsRecipient[]> {
  if (input.audience === "class" && input.classLevelId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId: input.schoolId,
        classLevelId: input.classLevelId,
        status: "ACTIVE",
      },
      include: {
        student: {
          include: {
            guardians: {
              include: { guardian: true },
              orderBy: [{ isPrimaryContact: "desc" }, { id: "asc" }],
            },
          },
        },
      },
    });

    const byPhone = new Map<string, GuardianSmsRecipient>();
    for (const enrollment of enrollments) {
      const primary =
        enrollment.student.guardians.find((g) => g.isPrimaryContact && g.guardian.phone?.trim()) ??
        enrollment.student.guardians.find((g) => g.guardian.phone?.trim());
      if (!primary) continue;
      const phones = uniqueNormalizedPhones([primary.guardian.phone, primary.guardian.altPhone]);
      const phone = phones[0];
      if (!phone || byPhone.has(phone)) continue;
      byPhone.set(phone, {
        phone: primary.guardian.phone,
        guardianId: primary.guardian.id,
        firstName: primary.guardian.firstName,
      });
    }
    return [...byPhone.values()];
  }

  // All primary guardians: enrolled students + open applications
  const [studentLinks, applicationLinks] = await Promise.all([
    prisma.studentGuardian.findMany({
      where: {
        isPrimaryContact: true,
        student: { schoolId: input.schoolId, deletedAt: null },
        guardian: { schoolId: input.schoolId },
      },
      include: { guardian: true },
    }),
    prisma.applicationGuardian.findMany({
      where: {
        isPrimaryContact: true,
        application: { schoolId: input.schoolId, deletedAt: null },
        guardian: { schoolId: input.schoolId },
      },
      include: { guardian: true },
    }),
  ]);

  const byPhone = new Map<string, GuardianSmsRecipient>();
  for (const link of [...studentLinks, ...applicationLinks]) {
    const phones = uniqueNormalizedPhones([link.guardian.phone, link.guardian.altPhone]);
    const phone = phones[0];
    if (!phone || byPhone.has(phone)) continue;
    byPhone.set(phone, {
      phone: link.guardian.phone,
      guardianId: link.guardian.id,
      firstName: link.guardian.firstName,
    });
  }
  return [...byPhone.values()];
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
