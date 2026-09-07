import { hash } from "bcryptjs";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import {
  CLASS_LEVELS,
  SUBJECTS,
  seedSchoolStructure,
} from "./seed-school-structure";

const prisma = new PrismaClient();

async function main() {
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? "admin@excellencekids.edu.gh";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow1!";
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME ?? "School";
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME ?? "Admin";

  const school = await seedSchoolStructure(prisma);

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
      mustChangePassword: true,
    },
    create: {
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: UserRole.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: school.id,
      mustChangePassword: true,
    },
  });

  console.log(`Seeded school "${school.name}" (${school.slug})`);
  console.log(
    `Class levels: ${CLASS_LEVELS.length}, subjects: ${SUBJECTS.length}`,
  );
  console.log(`Admin login: ${adminEmail}`);
  console.log(
    "Super admin: run `npm run db:seed:super-admin` (see prisma/seed-super-admin.ts)",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
