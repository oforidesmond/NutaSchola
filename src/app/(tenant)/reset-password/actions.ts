"use server";

import { headers } from "next/headers";
import { requestPasswordReset, resetPassword } from "@/lib/auth/tokens";
import { clientIpFromHeaders } from "@/lib/auth/throttle";

export async function requestPasswordResetAction(email: string) {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const normalized = email.trim().toLowerCase();
  return requestPasswordReset(normalized, `reset:${ip}:${normalized}`);
}

export async function resetPasswordAction(input: {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}) {
  return resetPassword(input);
}
