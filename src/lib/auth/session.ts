import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { requireTenant, type TenantContext } from "@/lib/tenancy";
import {
  assertPermission,
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
};

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", {
      status: 401,
    });
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: session.user.role,
    schoolId: session.user.schoolId,
    status: session.user.status,
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
