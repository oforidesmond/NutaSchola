/**
 * Standalone bootstrap for the hidden SUPER_ADMIN builder account.
 *
 * Run after migrations (and after the target school exists):
 *   npm run db:seed:super-admin
 *
 * Does not seed school structure, school admin, or demo data.
 */
import { hash } from "bcryptjs";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.DEFAULT_SCHOOL_SLUG ?? "excellence-kids";
  const email =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "super@nutaschola.local";
  const password =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMeNow1!";
  const firstName =
    process.env.SEED_SUPER_ADMIN_FIRST_NAME ?? "Platform";
  const lastName =
    process.env.SEED_SUPER_ADMIN_LAST_NAME ?? "Builder";

  const school = await prisma.school.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  if (!school) {
    throw new Error(
      `School with slug "${slug}" not found. Create the school first, then re-run this seed.`,
    );
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: school.id,
      deletedAt: null,
      mustChangePassword: false,
    },
    create: {
      email,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      schoolId: school.id,
      mustChangePassword: false,
    },
  });

  console.log(
    `Super admin ready for school "${school.name}" (${school.slug}): ${email}`,
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
