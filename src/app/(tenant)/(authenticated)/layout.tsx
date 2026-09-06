import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/lib/tenancy";
import { TenantShell } from "@/components/layout/TenantShell";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findFirst({
    where: { id: session.user.id },
    select: {
      status: true,
      deletedAt: true,
      mustChangePassword: true,
      firstName: true,
      lastName: true,
      email: true,
      schoolId: true,
      role: true,
    },
  });

  if (!dbUser || dbUser.deletedAt || dbUser.status === "INACTIVE" || dbUser.status === "SUSPENDED") {
    redirect("/login");
  }

  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  if (dbUser.mustChangePassword && !pathname.startsWith("/account/change-password")) {
    redirect("/account/change-password");
  }

  let schoolName = "Excellence Kids";
  if (dbUser.schoolId ?? session.user.schoolId) {
    const tenant = await requireTenant(dbUser.schoolId ?? session.user.schoolId);
    schoolName = tenant.school.name;
  }

  const userName = `${dbUser.firstName} ${dbUser.lastName}`.trim() || dbUser.email;

  return (
    <TenantShell
      userName={userName}
      schoolName={schoolName}
      role={dbUser.role}
      signOutAction={signOutAction}
      mustChangePassword={dbUser.mustChangePassword}
    >
      {children}
    </TenantShell>
  );
}
