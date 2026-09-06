"use server";

import { changePassword } from "@/lib/auth/tokens";

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return changePassword(input);
}
