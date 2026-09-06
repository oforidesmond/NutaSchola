"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/errors";

export async function loginAction(
  email: string,
  password: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db/prisma");
    const session = await auth();
    let redirectTo = "/dashboard";
    if (session?.user?.id) {
      const user = await prisma.user.findFirst({
        where: { id: session.user.id },
        select: { mustChangePassword: true },
      });
      if (user?.mustChangePassword) {
        redirectTo = "/account/change-password";
      }
    }
    return ok({ redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    // NextAuth may throw a redirect / NEXT_REDIRECT — rethrow those
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return fail("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
}
