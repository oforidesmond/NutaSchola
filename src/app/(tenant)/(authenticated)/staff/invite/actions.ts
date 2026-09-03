"use server";

import { inviteStaff } from "@/lib/auth/tokens";
import type { UserRole } from "@prisma/client";

export async function inviteStaffAction(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}) {
  return inviteStaff(input);
}
