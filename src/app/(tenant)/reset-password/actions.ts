"use server";

import { requestPasswordReset, resetPassword } from "@/lib/auth/tokens";

export async function requestPasswordResetAction(email: string) {
  return requestPasswordReset(email);
}

export async function resetPasswordAction(input: {
  email: string;
  token: string;
  password: string;
}) {
  return resetPassword(input);
}
