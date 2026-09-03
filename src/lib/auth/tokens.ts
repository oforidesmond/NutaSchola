import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/mail";
import { AppError, fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 48; // 48 hours

function createRawToken(): string {
  return randomBytes(32).toString("hex");
}

export async function inviteStaff(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}): Promise<ActionResult<{ userId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.STAFF_INVITE);

    if (input.role === "SUPER_ADMIN" || input.role === "PARENT") {
      throw new AppError("INVALID_ROLE", "Cannot invite this role via staff invite.");
    }

    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("EMAIL_IN_USE", "An account with this email already exists.", {
        fieldErrors: { email: ["Email is already registered"] },
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
        status: "INVITED",
        schoolId: tenant.schoolId,
      },
    });

    const token = createRawToken();
    await prisma.verificationToken.create({
      data: {
        identifier: `invite:${email}`,
        token,
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await sendEmail({
      to: email,
      subject: `You're invited to ${tenant.school.name}`,
      text: `Hi ${input.firstName},\n\nYou have been invited to join ${tenant.school.name} on Excellence Kids.\n\nAccept your invite:\n${baseUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}\n\nThis link expires in 48 hours.`,
    });

    return ok({ userId: user.id });
  } catch (error) {
    return fail(
      toActionError(error).code,
      toActionError(error).message,
      toActionError(error).fieldErrors,
    );
  }
}

export async function acceptInvite(input: {
  email: string;
  token: string;
  password: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const email = input.email.trim().toLowerCase();
    const record = await prisma.verificationToken.findUnique({
      where: { token: input.token },
    });

    if (
      !record ||
      record.identifier !== `invite:${email}` ||
      record.expires < new Date()
    ) {
      throw new AppError("INVALID_TOKEN", "This invite link is invalid or has expired.");
    }

    if (input.password.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", {
        fieldErrors: { password: ["Use at least 8 characters"] },
      });
    }

    const passwordHash = await hash(input.password, 12);
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        status: "ACTIVE",
      },
    });

    await prisma.verificationToken.delete({
      where: { token: input.token },
    });

    return ok({ email });
  } catch (error) {
    return fail(
      toActionError(error).code,
      toActionError(error).message,
      toActionError(error).fieldErrors,
    );
  }
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<ActionResult<{ sent: true }>> {
  try {
    const email = emailRaw.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // Always return ok to avoid email enumeration
    if (user) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: `reset:${email}` },
      });

      const token = createRawToken();
      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token,
          expires: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const baseUrl =
        process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendEmail({
        to: email,
        subject: "Reset your Excellence Kids password",
        text: `Reset your password:\n${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}\n\nThis link expires in 48 hours.`,
      });
    }

    return ok({ sent: true });
  } catch (error) {
    return fail(toActionError(error).code, toActionError(error).message);
  }
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const email = input.email.trim().toLowerCase();
    const record = await prisma.verificationToken.findUnique({
      where: { token: input.token },
    });

    if (
      !record ||
      record.identifier !== `reset:${email}` ||
      record.expires < new Date()
    ) {
      throw new AppError("INVALID_TOKEN", "This reset link is invalid or has expired.");
    }

    if (input.password.length < 8) {
      throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", {
        fieldErrors: { password: ["Use at least 8 characters"] },
      });
    }

    const passwordHash = await hash(input.password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash, status: "ACTIVE" },
    });

    await prisma.verificationToken.delete({
      where: { token: input.token },
    });

    return ok({ email });
  } catch (error) {
    return fail(
      toActionError(error).code,
      toActionError(error).message,
      toActionError(error).fieldErrors,
    );
  }
}
