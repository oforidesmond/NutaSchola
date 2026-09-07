import {
  PrismaClient,
  SchoolLevel,
  type School,
  type SchoolSettings,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export const CLASS_LEVELS: {
  name: string;
  levelType: SchoolLevel;
  order: number;
}[] = [
  { name: "Creche", levelType: SchoolLevel.CRECHE, order: 1 },
  { name: "Nursery", levelType: SchoolLevel.NURSERY, order: 2 },
  { name: "KG1", levelType: SchoolLevel.KINDERGARTEN, order: 3 },
  { name: "KG2", levelType: SchoolLevel.KINDERGARTEN, order: 4 },
  { name: "Primary 1", levelType: SchoolLevel.PRIMARY, order: 5 },
  { name: "Primary 2", levelType: SchoolLevel.PRIMARY, order: 6 },
  { name: "Primary 3", levelType: SchoolLevel.PRIMARY, order: 7 },
  { name: "Primary 4", levelType: SchoolLevel.PRIMARY, order: 8 },
  { name: "Primary 5", levelType: SchoolLevel.PRIMARY, order: 9 },
  { name: "Primary 6", levelType: SchoolLevel.PRIMARY, order: 10 },
  { name: "JHS 1", levelType: SchoolLevel.JUNIOR_HIGH, order: 11 },
  { name: "JHS 2", levelType: SchoolLevel.JUNIOR_HIGH, order: 12 },
  { name: "JHS 3", levelType: SchoolLevel.JUNIOR_HIGH, order: 13 },
];

export const SUBJECTS: { name: string; code: string }[] = [
  { name: "English Language", code: "ENG" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Religious and Moral Education", code: "RME" },
  { name: "Creative Arts", code: "CA" },
  { name: "Our World Our People", code: "OWOP" },
];

export type SeededSchool = School & { settings: SchoolSettings | null };

/** Upserts Excellence Kids school + academic structure. Creates no users. */
export async function seedSchoolStructure(
  prisma: PrismaClient,
): Promise<SeededSchool> {
  const slug = process.env.DEFAULT_SCHOOL_SLUG ?? "excellence-kids";

  const school = await prisma.school.upsert({
    where: { slug },
    update: {
      name: "Excellence Kids",
      logoUrl: "/brand/excellence-kids-logo.svg",
      country: "Ghana",
      timezone: "Africa/Accra",
      currency: "GHS",
      city: "Accra",
      region: "Greater Accra",
      contactEmail: "info@excellencekids.edu.gh",
      levels: [
        SchoolLevel.CRECHE,
        SchoolLevel.NURSERY,
        SchoolLevel.KINDERGARTEN,
        SchoolLevel.PRIMARY,
        SchoolLevel.JUNIOR_HIGH,
      ],
      isActive: true,
      onboardedAt: new Date(),
      deletedAt: null,
    },
    create: {
      name: "Excellence Kids",
      slug,
      logoUrl: "/brand/excellence-kids-logo.svg",
      address: null,
      city: "Accra",
      region: "Greater Accra",
      country: "Ghana",
      contactEmail: "info@excellencekids.edu.gh",
      contactPhone: null,
      timezone: "Africa/Accra",
      currency: "GHS",
      levels: [
        SchoolLevel.CRECHE,
        SchoolLevel.NURSERY,
        SchoolLevel.KINDERGARTEN,
        SchoolLevel.PRIMARY,
        SchoolLevel.JUNIOR_HIGH,
      ],
      isActive: true,
      onboardedAt: new Date(),
      settings: {
        create: {
          admissionNumberPrefix: "EK",
          applicationNumberPrefix: "APP",
          enableOnlineApplication: true,
          enableEmailNotifications: true,
          enableSmsNotifications: false,
        },
      },
    },
    include: { settings: true },
  });

  if (!school.settings) {
    await prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        admissionNumberPrefix: "EK",
        applicationNumberPrefix: "APP",
      },
    });
  }

  const yearName = "2025/2026";
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: yearName,
      },
    },
    update: {
      isCurrent: true,
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
    },
    create: {
      schoolId: school.id,
      name: yearName,
      isCurrent: true,
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
    },
  });

  await prisma.academicYear.updateMany({
    where: {
      schoolId: school.id,
      name: { not: yearName },
      isCurrent: true,
    },
    data: { isCurrent: false },
  });

  const terms = [
    {
      name: "Term 1",
      startDate: new Date("2025-09-01T00:00:00.000Z"),
      endDate: new Date("2025-12-15T00:00:00.000Z"),
      isCurrent: true,
    },
    {
      name: "Term 2",
      startDate: new Date("2026-01-05T00:00:00.000Z"),
      endDate: new Date("2026-04-10T00:00:00.000Z"),
      isCurrent: false,
    },
    {
      name: "Term 3",
      startDate: new Date("2026-04-20T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
      isCurrent: false,
    },
  ];

  for (const term of terms) {
    await prisma.term.upsert({
      where: {
        academicYearId_name: {
          academicYearId: academicYear.id,
          name: term.name,
        },
      },
      update: {
        startDate: term.startDate,
        endDate: term.endDate,
        isCurrent: term.isCurrent,
      },
      create: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        isCurrent: term.isCurrent,
      },
    });
  }

  for (const level of CLASS_LEVELS) {
    const classLevel = await prisma.classLevel.upsert({
      where: {
        schoolId_name: { schoolId: school.id, name: level.name },
      },
      update: {
        levelType: level.levelType,
        order: level.order,
      },
      create: {
        schoolId: school.id,
        name: level.name,
        levelType: level.levelType,
        order: level.order,
      },
    });

    await prisma.section.upsert({
      where: {
        classLevelId_name: {
          classLevelId: classLevel.id,
          name: "A",
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        classLevelId: classLevel.id,
        name: "A",
      },
    });
  }

  for (const subject of SUBJECTS) {
    await prisma.subject.upsert({
      where: {
        schoolId_name: { schoolId: school.id, name: subject.name },
      },
      update: { code: subject.code },
      create: {
        schoolId: school.id,
        name: subject.name,
        code: subject.code,
      },
    });
  }

  const admissionFee = await prisma.feeStructure.findFirst({
    where: { schoolId: school.id, isAdmissionFee: true },
  });

  if (!admissionFee) {
    await prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        name: "Admission Fee",
        isAdmissionFee: true,
        items: {
          create: [
            {
              name: "Admission fee",
              amount: new Decimal("150.00"),
            },
          ],
        },
      },
    });
  }

  return school;
}
