import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import {
  sendEmail,
  inviteEmail,
  passwordResetEmail,
  appBaseUrl,
} from "@/lib/mail";
import { AppError, fail, ok, toActionError, type ActionResult } from "@/lib/errors";
import { requireAction, requireSession } from "@/lib/auth/session";
import { assertNotThrottled } from "@/lib/auth/throttle";
import { ACTIONS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

/** Invite links expire after 48 hours. */
export const INVITE_TTL_MS = 1000 * 60 * 60 * 48;
export const INVITE_TTL_HOURS = 48;

/** Password-reset links expire after 1 hour. */
export const RESET_TTL_MS = 1000 * 60 * 60;
export const RESET_TTL_HOURS = 1;

function createRawToken(): string {
  return randomBytes(32).toString("hex");
}

/** Store sha256(raw) at rest — email/link carries the raw token. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function inviteIdentifier(email: string): string {
  return `invite:${email}`;
}

function resetIdentifier(email: string): string {
  return `reset:${email}`;
}

async function createInviteToken(email: string): Promise<{ raw: string; expires: Date }> {
  await prisma.verificationToken.deleteMany({
    where: { identifier: inviteIdentifier(email) },
  });

  const raw = createRawToken();
  const expires = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.verificationToken.create({
    data: {
      identifier: inviteIdentifier(email),
      token: hashToken(raw),
      expires,
    },
  });
  return { raw, expires };
}

async function sendInviteMail(input: {
  email: string;
  firstName: string;
  schoolName: string;
  rawToken: string;
}): Promise<void> {
  const acceptUrl = `${appBaseUrl()}/accept-invite?token=${input.rawToken}&email=${encodeURIComponent(input.email)}`;
  const content = inviteEmail({
    firstName: input.firstName,
    schoolName: input.schoolName,
    acceptUrl,
    expiresInHours: INVITE_TTL_HOURS,
  });
  await sendEmail({
    to: input.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

function assertPasswordStrength(password: string, confirm?: string): void {
  if (password.length < 8) {
    throw new AppError("WEAK_PASSWORD", "Password must be at least 8 characters.", {
      fieldErrors: { password: ["Use at least 8 characters"] },
    });
  }
  if (confirm !== undefined && password !== confirm) {
    throw new AppError("PASSWORD_MISMATCH", "Passwords do not match.", {
      fieldErrors: { confirmPassword: ["Passwords do not match"] },
    });
  }
}

export async function inviteStaff(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  throttleKey?: string;
}): Promise<ActionResult<{ userId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.STAFF_INVITE);

    if (input.role === "SUPER_ADMIN" || input.role === "PARENT") {
      throw new AppError("INVALID_ROLE", "Cannot invite this role via staff invite.");
    }

    const email = input.email.trim().toLowerCase();
    const throttle = assertNotThrottled(
      input.throttleKey ?? `invite:${tenant.schoolId}:${email}`,
    );
    if (!throttle.ok) {
      throw new AppError(
        "RATE_LIMITED",
        `Please wait ${throttle.retryAfterSeconds}s before sending another invite to this address.`,
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    let userId: string;
    let firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (existing) {
      if (existing.deletedAt && existing.schoolId === tenant.schoolId) {
        // Revive a previously revoked invite for the same school.
        const revived = await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            role: input.role,
            status: "INVITED",
            passwordHash: null,
            mustChangePassword: false,
            deletedAt: null,
            schoolId: tenant.schoolId,
          },
        });
        userId = revived.id;
      } else if (
        existing.schoolId === tenant.schoolId &&
        existing.status === "INVITED" &&
        !existing.deletedAt
      ) {
        // Re-invite pending staff (same as resend with updated name/role).
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            role: input.role,
          },
        });
        userId = updated.id;
        firstName = updated.firstName;
      } else {
        throw new AppError("EMAIL_IN_USE", "An account with this email already exists.", {
          fieldErrors: { email: ["Email is already registered"] },
        });
      }
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: input.role,
          status: "INVITED",
          mustChangePassword: false,
          schoolId: tenant.schoolId,
        },
      });
      userId = user.id;
    }

    const { raw } = await createInviteToken(email);
    await sendInviteMail({
      email,
      firstName,
      schoolName: tenant.school.name,
      rawToken: raw,
    });

    return ok({ userId });
  } catch (error) {
    return fail(
      toActionError(error).code,
      toActionError(error).message,
      toActionError(error).fieldErrors,
    );
  }
}

export async function resendInvite(
  userId: string,
  throttleKey?: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.STAFF_INVITE);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: tenant.schoolId,
        deletedAt: null,
        status: "INVITED",
        role: { not: "SUPER_ADMIN" },
      },
    });
    if (!user) {
      throw new AppError("NOT_FOUND", "Pending invite not found.");
    }

    const throttle = assertNotThrottled(
      throttleKey ?? `invite:${tenant.schoolId}:${user.email}`,
    );
    if (!throttle.ok) {
      throw new AppError(
        "RATE_LIMITED",
        `Please wait ${throttle.retryAfterSeconds}s before resending this invite.`,
      );
    }

    const { raw } = await createInviteToken(user.email);
    await sendInviteMail({
      email: user.email,
      firstName: user.firstName,
      schoolName: tenant.school.name,
      rawToken: raw,
    });

    return ok({ userId: user.id });
  } catch (error) {
    return fail(toActionError(error).code, toActionError(error).message);
  }
}

export async function revokeInvite(userId: string): Promise<ActionResult<{ userId: string }>> {
  try {
    const { tenant } = await requireAction(ACTIONS.STAFF_INVITE);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: tenant.schoolId,
        deletedAt: null,
        status: "INVITED",
        role: { not: "SUPER_ADMIN" },
      },
    });
    if (!user) {
      throw new AppError("NOT_FOUND", "Pending invite not found.");
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: inviteIdentifier(user.email) },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    return ok({ userId: user.id });
  } catch (error) {
    return fail(toActionError(error).code, toActionError(error).message);
  }
}

export async function setStaffActiveState(
  userId: string,
  active: boolean,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const { user: actor, tenant } = await requireAction(ACTIONS.STAFF_INVITE);

    if (userId === actor.id) {
      throw new AppError("FORBIDDEN", "You cannot deactivate your own account.");
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: tenant.schoolId,
        deletedAt: null,
        status: { in: ["ACTIVE", "INACTIVE"] },
        role: { not: "SUPER_ADMIN" },
      },
    });
    if (!user) {
      throw new AppError("NOT_FOUND", "Staff account not found.");
    }

    if (user.role === "SCHOOL_OWNER" && !active) {
      throw new AppError("FORBIDDEN", "School owner accounts cannot be deactivated here.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { status: active ? "ACTIVE" : "INACTIVE" },
    });

    return ok({ userId: user.id });
  } catch (error) {
    return fail(toActionError(error).code, toActionError(error).message);
  }
}

export async function acceptInvite(input: {
  email: string;
  token: string;
  password: string;
  confirmPassword?: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const email = input.email.trim().toLowerCase();
    assertPasswordStrength(input.password, input.confirmPassword);

    const record = await prisma.verificationToken.findUnique({
      where: { token: hashToken(input.token) },
    });

    if (
      !record ||
      record.identifier !== inviteIdentifier(email) ||
      record.expires < new Date()
    ) {
      throw new AppError("INVALID_TOKEN", "This invite link is invalid or has expired.");
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null, status: "INVITED" },
    });
    if (!user) {
      throw new AppError("INVALID_TOKEN", "This invite link is invalid or has expired.");
    }

    const passwordHash = await hash(input.password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });

    await prisma.verificationToken.delete({
      where: { token: record.token },
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
  throttleKey?: string,
): Promise<ActionResult<{ sent: true }>> {
  try {
    const email = emailRaw.trim().toLowerCase();
    const throttle = assertNotThrottled(throttleKey ?? `reset:${email}`);
    if (!throttle.ok) {
      // Same generic success response — do not reveal throttling tied to existence.
      return ok({ sent: true });
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // Always return ok to avoid email enumeration
    if (user) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: resetIdentifier(email) },
      });

      const raw = createRawToken();
      await prisma.verificationToken.create({
        data: {
          identifier: resetIdentifier(email),
          token: hashToken(raw),
          expires: new Date(Date.now() + RESET_TTL_MS),
        },
      });

      const resetUrl = `${appBaseUrl()}/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
      const content = passwordResetEmail({
        resetUrl,
        expiresInHours: RESET_TTL_HOURS,
      });
      await sendEmail({
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
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
  confirmPassword?: string;
}): Promise<ActionResult<{ email: string }>> {
  try {
    const email = input.email.trim().toLowerCase();
    assertPasswordStrength(input.password, input.confirmPassword);

    const record = await prisma.verificationToken.findUnique({
      where: { token: hashToken(input.token) },
    });

    if (
      !record ||
      record.identifier !== resetIdentifier(email) ||
      record.expires < new Date()
    ) {
      throw new AppError("INVALID_TOKEN", "This reset link is invalid or has expired.");
    }

    const passwordHash = await hash(input.password, 12);
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });

    await prisma.verificationToken.delete({
      where: { token: record.token },
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

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<{ changed: true }>> {
  try {
    const sessionUser = await requireSession();
    assertPasswordStrength(input.newPassword, input.confirmPassword);

    const user = await prisma.user.findFirst({
      where: { id: sessionUser.id, deletedAt: null },
    });
    if (!user?.passwordHash) {
      throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", { status: 401 });
    }

    const valid = await compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError("INVALID_CREDENTIALS", "Current password is incorrect.", {
        fieldErrors: { currentPassword: ["Current password is incorrect"] },
      });
    }

    const passwordHash = await hash(input.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        status: "ACTIVE",
      },
    });

    return ok({ changed: true });
  } catch (error) {
    return fail(
      toActionError(error).code,
      toActionError(error).message,
      toActionError(error).fieldErrors,
    );
  }
}

/** Whether an invite token for this email is still valid (non-expired). */
export async function hasValidInviteToken(email: string): Promise<boolean> {
  const now = new Date();
  const count = await prisma.verificationToken.count({
    where: {
      identifier: inviteIdentifier(email.trim().toLowerCase()),
      expires: { gt: now },
    },
  });
  return count > 0;
}
