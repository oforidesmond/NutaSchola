/**
 * School-only bootstrap — no users.
 *
 * Prod:
 *   npm run db:migrate:deploy
 *   npm run db:seed:school
 *   npm run db:seed:super-admin
 */
import { PrismaClient } from "@prisma/client";
import {
  CLASS_LEVELS,
  SUBJECTS,
  seedSchoolStructure,
} from "./seed-school-structure";

const prisma = new PrismaClient();

async function main() {
  const school = await seedSchoolStructure(prisma);
  console.log(`Seeded school "${school.name}" (${school.slug})`);
  console.log(
    `Class levels: ${CLASS_LEVELS.length}, subjects: ${SUBJECTS.length}`,
  );
  console.log("No users created — run `npm run db:seed:super-admin` next.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
