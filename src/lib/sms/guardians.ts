import { prisma } from "@/lib/db/prisma";

export type PrimaryGuardianContact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  altPhone: string | null;
} | null;

/**
 * Prefer primary contact; fall back to first linked guardian with a phone.
 */
export async function resolvePrimaryGuardianContact(
  applicationId: string,
): Promise<PrimaryGuardianContact> {
  const links = await prisma.applicationGuardian.findMany({
    where: { applicationId },
    include: { guardian: true },
    orderBy: [{ isPrimaryContact: "desc" }, { id: "asc" }],
  });

  const withPhone = links.find((link) => link.guardian.phone?.trim());
  if (!withPhone) return null;

  const g = withPhone.guardian;
  return {
    firstName: g.firstName,
    lastName: g.lastName,
    email: g.email,
    phone: g.phone,
    altPhone: g.altPhone,
  };
}
