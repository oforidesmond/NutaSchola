import { AppError } from "@/lib/errors";
import type { UserRole } from "@prisma/client";

/**
 * Permission actions used by Server Actions / route handlers.
 * Keep this map explicit — no speculative roles beyond schema UserRole.
 */
export const ACTIONS = {
  SCHOOL_SETTINGS_READ: "school.settings.read",
  SCHOOL_SETTINGS_UPDATE: "school.settings.update",
  STAFF_INVITE: "staff.invite",
  STAFF_MANAGE: "staff.manage",
  PLATFORM_ADMIN: "platform.admin",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

const ALL_TENANT_ACTIONS: Action[] = [
  ACTIONS.SCHOOL_SETTINGS_READ,
  ACTIONS.SCHOOL_SETTINGS_UPDATE,
  ACTIONS.STAFF_INVITE,
  ACTIONS.STAFF_MANAGE,
];

const ROLE_PERMISSIONS: Record<UserRole, readonly Action[]> = {
  SUPER_ADMIN: [...ALL_TENANT_ACTIONS, ACTIONS.PLATFORM_ADMIN],
  SCHOOL_OWNER: ALL_TENANT_ACTIONS,
  SCHOOL_ADMIN: ALL_TENANT_ACTIONS,
  ADMISSIONS_OFFICER: [ACTIONS.SCHOOL_SETTINGS_READ],
  ACCOUNTANT: [ACTIONS.SCHOOL_SETTINGS_READ],
  TEACHER: [ACTIONS.SCHOOL_SETTINGS_READ],
  FRONT_DESK: [ACTIONS.SCHOOL_SETTINGS_READ],
  IT_SUPPORT: [
    ACTIONS.SCHOOL_SETTINGS_READ,
    ACTIONS.SCHOOL_SETTINGS_UPDATE,
    ACTIONS.STAFF_INVITE,
  ],
  PARENT: [],
};

export function can(role: UserRole, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function assertPermission(role: UserRole, action: Action): void {
  if (!can(role, action)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${action}`, { status: 403 });
  }
}
