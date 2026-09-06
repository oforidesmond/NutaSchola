import { prisma } from "@/lib/db/prisma";
import type { ReportSchoolBrand } from "./types";

export async function loadSchoolBrand(schoolId: string): Promise<ReportSchoolBrand> {
  const school = await prisma.school.findUniqueOrThrow({
    where: { id: schoolId },
    select: {
      name: true,
      address: true,
      city: true,
      region: true,
      contactPhone: true,
      contactEmail: true,
    },
  });
  return school;
}
