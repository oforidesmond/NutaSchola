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

  ACADEMIC_READ: "academic.read",
  ACADEMIC_MANAGE: "academic.manage",

  ADMISSIONS_READ: "admissions.read",
  ADMISSIONS_CREATE: "admissions.create",
  ADMISSIONS_UPDATE: "admissions.update",
  ADMISSIONS_STAGE: "admissions.stage",
  ADMISSIONS_DOCUMENTS: "admissions.documents",
  ADMISSIONS_FEES: "admissions.fees",
  ADMISSIONS_CONVERT: "admissions.convert",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

const ACADEMIC_ACTIONS: Action[] = [ACTIONS.ACADEMIC_READ, ACTIONS.ACADEMIC_MANAGE];

const ADMISSIONS_CORE: Action[] = [
  ACTIONS.ADMISSIONS_READ,
  ACTIONS.ADMISSIONS_CREATE,
  ACTIONS.ADMISSIONS_UPDATE,
  ACTIONS.ADMISSIONS_STAGE,
  ACTIONS.ADMISSIONS_DOCUMENTS,
];

const ADMISSIONS_FULL: Action[] = [
  ...ADMISSIONS_CORE,
  ACTIONS.ADMISSIONS_FEES,
  ACTIONS.ADMISSIONS_CONVERT,
];

const ALL_TENANT_ACTIONS: Action[] = [
  ACTIONS.SCHOOL_SETTINGS_READ,
  ACTIONS.SCHOOL_SETTINGS_UPDATE,
  ACTIONS.STAFF_INVITE,
  ACTIONS.STAFF_MANAGE,
  ...ACADEMIC_ACTIONS,
  ...ADMISSIONS_FULL,
];

const ROLE_PERMISSIONS: Record<UserRole, readonly Action[]> = {
  SUPER_ADMIN: [...ALL_TENANT_ACTIONS, ACTIONS.PLATFORM_ADMIN],
  SCHOOL_OWNER: ALL_TENANT_ACTIONS,
  SCHOOL_ADMIN: ALL_TENANT_ACTIONS,
  ADMISSIONS_OFFICER: [
    ACTIONS.SCHOOL_SETTINGS_READ,
    ACTIONS.ACADEMIC_READ,
    ...ADMISSIONS_FULL,
  ],
  ACCOUNTANT: [
    ACTIONS.SCHOOL_SETTINGS_READ,
    ACTIONS.ACADEMIC_READ,
    ACTIONS.ADMISSIONS_READ,
    ACTIONS.ADMISSIONS_FEES,
  ],
  TEACHER: [ACTIONS.SCHOOL_SETTINGS_READ, ACTIONS.ACADEMIC_READ],
  FRONT_DESK: [
    ACTIONS.SCHOOL_SETTINGS_READ,
    ACTIONS.ACADEMIC_READ,
    ...ADMISSIONS_CORE,
    ACTIONS.ADMISSIONS_FEES,
  ],
  IT_SUPPORT: [
    ACTIONS.SCHOOL_SETTINGS_READ,
    ACTIONS.SCHOOL_SETTINGS_UPDATE,
    ACTIONS.STAFF_INVITE,
    ACTIONS.ACADEMIC_READ,
    ACTIONS.ADMISSIONS_READ,
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
