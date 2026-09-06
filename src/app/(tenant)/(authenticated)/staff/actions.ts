"use server";

import { headers } from "next/headers";
import {
  inviteStaff,
  resendInvite,
  revokeInvite,
  setStaffActiveState,
} from "@/lib/auth/tokens";
import { clientIpFromHeaders } from "@/lib/auth/throttle";
import type { UserRole } from "@prisma/client";

export async function inviteStaffAction(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}) {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const email = input.email.trim().toLowerCase();
  return inviteStaff({
    ...input,
    throttleKey: `invite:${ip}:${email}`,
  });
}

export async function resendInviteAction(userId: string) {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  return resendInvite(userId, `invite-resend:${ip}:${userId}`);
}

export async function revokeInviteAction(userId: string) {
  return revokeInvite(userId);
}

export async function setStaffActiveAction(userId: string, active: boolean) {
  return setStaffActiveState(userId, active);
}
