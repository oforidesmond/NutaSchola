import { hash } from "bcryptjs";
import {
  PrismaClient,
  SchoolLevel,
  UserRole,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.DEFAULT_SCHOOL_SLUG ?? "excellence-kids";
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? "admin@excellencekids.edu.gh";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow1!";
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME ?? "School";
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME ?? "Admin";

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
  await prisma.academicYear.upsert({
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

  // Ensure only one current year for this school
  await prisma.academicYear.updateMany({
    where: {
      schoolId: school.id,
      name: { not: yearName },
      isCurrent: true,
    },
    data: { isCurrent: false },
  });

  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: adminFirstName,
      lastName: adminLastName,
      role: UserRole.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: school.id,
      deletedAt: null,
    },
    create: {
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: UserRole.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: school.id,
    },
  });

  console.log(`Seeded school "${school.name}" (${school.slug})`);
  console.log(`Admin login: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
