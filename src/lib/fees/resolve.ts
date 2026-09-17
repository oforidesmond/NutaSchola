import type { FeeStructure, FeeItem, Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";

export type FeeStructureWithItems = FeeStructure & { items: FeeItem[] };

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Resolve SCHOOL_FEES structure for a term + class level.
 * Class-level-specific row overrides the null (all-levels) default.
 */
export async function resolveSchoolFeeStructure(
  db: Db,
  schoolId: string,
  termId: string,
  classLevelId: string | null,
): Promise<FeeStructureWithItems> {
  if (classLevelId) {
    const specific = await db.feeStructure.findFirst({
      where: {
        schoolId,
        feeType: "SCHOOL_FEES",
        termId,
        classLevelId,
      },
      include: { items: true },
    });
    if (specific && specific.items.length > 0) {
      return specific;
    }
  }

  const fallback = await db.feeStructure.findFirst({
    where: {
      schoolId,
      feeType: "SCHOOL_FEES",
      termId,
      classLevelId: null,
    },
    include: { items: true },
  });

  if (!fallback || fallback.items.length === 0) {
    throw new AppError(
      "NOT_FOUND",
      "No school fees structure is configured for this term and class level.",
      { status: 404 },
    );
  }

  return fallback;
}
