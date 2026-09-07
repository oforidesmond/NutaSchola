import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  School,
  CalendarRange,
  Layers,
  BookOpen,
  Wallet,
  Users,
  Megaphone,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { ACTIONS, can, type Action } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exactly, or treat as prefix for nested routes */
  match?: "exact" | "prefix";
  /** Required permission to show this item in the sidebar */
  action?: Action;
};

export type NavGroup = {
  id: string;
  label?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    items: [
      {
        href: "/admissions",
        label: "Overview",
        icon: ClipboardList,
        match: "exact",
        action: ACTIONS.ADMISSIONS_READ,
      },
      {
        href: "/admissions/applications",
        label: "Applications",
        icon: FileText,
        match: "prefix",
        action: ACTIONS.ADMISSIONS_READ,
      },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    items: [
      {
        href: "/communications",
        label: "Compose SMS",
        icon: Megaphone,
        match: "prefix",
        action: ACTIONS.COMMUNICATIONS_SEND,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        href: "/settings/school",
        label: "School",
        icon: School,
        match: "exact",
        action: ACTIONS.SCHOOL_SETTINGS_READ,
      },
      {
        href: "/settings/academic",
        label: "Academic years",
        icon: CalendarRange,
        match: "exact",
        action: ACTIONS.ACADEMIC_READ,
      },
      {
        href: "/settings/classes",
        label: "Classes & sections",
        icon: Layers,
        match: "exact",
        action: ACTIONS.ACADEMIC_READ,
      },
      {
        href: "/settings/subjects",
        label: "Subjects",
        icon: BookOpen,
        match: "exact",
        action: ACTIONS.ACADEMIC_READ,
      },
      {
        href: "/settings/fees",
        label: "Fees",
        icon: Wallet,
        match: "exact",
        action: ACTIONS.FEES_READ,
      },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    items: [
      {
        href: "/staff",
        label: "Staff",
        icon: Users,
        match: "prefix",
        action: ACTIONS.STAFF_INVITE,
      },
    ],
  },
];

export function getNavGroupsForRole(role: UserRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.action || can(role, item.action)),
  })).filter((group) => group.items.length > 0);
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
