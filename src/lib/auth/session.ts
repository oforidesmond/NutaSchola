import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { requireTenant, type TenantContext } from "@/lib/tenancy";
import {
  assertPermission,
  can,
  type Action,
} from "@/lib/permissions";
import type { UserRole, UserStatus } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
};

/**
 * Require a signed-in user and re-check live DB status so deactivate /
 * soft-delete take effect on the next server action / RSC request.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", {
      status: 401,
    });
  }

  const dbUser = await prisma.user.findFirst({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      schoolId: true,
      status: true,
      deletedAt: true,
      mustChangePassword: true,
    },
  });

  if (!dbUser || dbUser.deletedAt) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", {
      status: 401,
    });
  }

  if (dbUser.status === "INACTIVE" || dbUser.status === "SUSPENDED") {
    throw new AppError(
      "ACCOUNT_DISABLED",
      "Your account has been deactivated. Contact your school administrator.",
      { status: 403 },
    );
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: `${dbUser.firstName} ${dbUser.lastName}`,
    role: dbUser.role,
    schoolId: dbUser.schoolId,
    status: dbUser.status,
    mustChangePassword: dbUser.mustChangePassword,
  };
}

export async function requireStaffSession(): Promise<{
  user: SessionUser;
  tenant: TenantContext;
}> {
  const user = await requireSession();

  if (user.role === "SUPER_ADMIN" && !user.schoolId) {
    throw new AppError(
      "TENANT_REQUIRED",
      "Platform admins must select a school context for tenant operations.",
      { status: 403 },
    );
  }

  const tenant = await requireTenant(user.schoolId);
  return { user, tenant };
}

export async function requireAction(action: Action): Promise<{
  user: SessionUser;
  tenant: TenantContext;
}> {
  const ctx = await requireStaffSession();
  try {
    assertPermission(ctx.user.role, action);
  } catch {
    throw new AppError("FORBIDDEN", "You do not have permission for this action.", {
      status: 403,
    });
  }
  return ctx;
}

/**
 * Soft page-level gate: redirect to the dashboard instead of throwing so
 * users never see a raw FORBIDDEN runtime error for expected RBAC denials.
 */
export async function requirePageAccess(action: Action): Promise<{
  user: SessionUser;
  tenant: TenantContext;
}> {
  const ctx = await requireStaffSession();
  if (!can(ctx.user.role, action)) {
    redirect("/dashboard?denied=1");
  }
  return ctx;
}
