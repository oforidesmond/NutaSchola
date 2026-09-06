import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
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
  if (!session?.user) {
    redirect("/login");
  }

  let schoolName = "Excellence Kids";
  if (session.user.schoolId) {
    const tenant = await requireTenant(session.user.schoolId);
    schoolName = tenant.school.name;
  }

  return (
    <TenantShell
      userName={session.user.name ?? session.user.email ?? "Staff"}
      schoolName={schoolName}
      signOutAction={signOutAction}
    >
      {children}
    </TenantShell>
  );
}
