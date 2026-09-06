import type { Prisma, RelationshipType } from "@prisma/client";
import { AppError } from "@/lib/errors";

type Tx = Prisma.TransactionClient;

export type GuardianInput = {
  firstName: string;
  lastName: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  occupation?: string | null;
  address?: string | null;
};

/**
 * Create-or-link a Guardian by phone within the tenant. If a Guardian with
 * this phone already exists for the school, the existing record is reused
 * as-is — we intentionally do not overwrite its contact details here, since
 * another application (a sibling's) may already depend on them. Staff can
 * edit the guardian record directly from a future guardians screen.
 */
export async function findOrCreateGuardian(
  tx: Tx,
  schoolId: string,
  input: GuardianInput,
) {
  const phone = input.phone.trim();
  if (!phone) {
    throw new AppError("VALIDATION_ERROR", "Guardian phone is required.", {
      fieldErrors: { phone: ["Guardian phone is required."] },
    });
  }

  const existing = await tx.guardian.findFirst({
    where: { schoolId, phone },
  });
  if (existing) return existing;

  return tx.guardian.create({
    data: {
      schoolId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone,
      altPhone: input.altPhone?.trim() || null,
      email: input.email?.trim() || null,
      occupation: input.occupation?.trim() || null,
      address: input.address?.trim() || null,
    },
  });
}

/**
 * Link (or update the link for) a Guardian on an application. When marked
 * primary, every other guardian on the same application is demoted first so
 * there is always at most one primary contact.
 */
export async function linkGuardianToApplication(
  tx: Tx,
  input: {
    applicationId: string;
    guardianId: string;
    relationship: RelationshipType;
    isPrimaryContact: boolean;
  },
) {
  if (input.isPrimaryContact) {
    await tx.applicationGuardian.updateMany({
      where: { applicationId: input.applicationId },
      data: { isPrimaryContact: false },
    });
  }

  return tx.applicationGuardian.upsert({
    where: {
      applicationId_guardianId: {
        applicationId: input.applicationId,
        guardianId: input.guardianId,
      },
    },
    update: {
      relationship: input.relationship,
      isPrimaryContact: input.isPrimaryContact,
    },
    create: {
      applicationId: input.applicationId,
      guardianId: input.guardianId,
      relationship: input.relationship,
      isPrimaryContact: input.isPrimaryContact,
    },
  });
}
