"use server";

import { acceptInvite } from "@/lib/auth/tokens";

export async function acceptInviteAction(input: {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}) {
  return acceptInvite(input);
}
