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
  GraduationCap,
  ShoppingBag,
  Package,
  Settings,
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

export type SettingsLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  action: Action;
};

export const SETTINGS_LINKS: SettingsLink[] = [
  {
    href: "/settings/school",
    label: "School",
    description: "Name, address, admission numbering, and notification defaults.",
    icon: School,
    action: ACTIONS.SCHOOL_SETTINGS_READ,
  },
  {
    href: "/settings/academic",
    label: "Academic years",
    description: "Years, terms, and which ones are current.",
    icon: CalendarRange,
    action: ACTIONS.ACADEMIC_READ,
  },
  {
    href: "/settings/classes",
    label: "Classes & sections",
    description: "Class levels and sections for this school.",
    icon: Layers,
    action: ACTIONS.ACADEMIC_READ,
  },
  {
    href: "/settings/subjects",
    label: "Subjects",
    description: "Subjects and their codes.",
    icon: BookOpen,
    action: ACTIONS.ACADEMIC_READ,
  },
  {
    href: "/settings/fees",
    label: "Fees",
    description: "Admission and school fee amounts.",
    icon: Wallet,
    action: ACTIONS.FEES_READ,
  },
];

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
      {
        href: "/admissions/import",
        label: "Import",
        icon: FileText,
        match: "exact",
        action: ACTIONS.ADMISSIONS_CREATE,
      },
    ],
  },
  {
    id: "students",
    label: "Students",
    items: [
      {
        href: "/students",
        label: "Enrolled",
        icon: GraduationCap,
        match: "prefix",
        action: ACTIONS.FEES_READ,
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      {
        href: "/sales/stationery",
        label: "Stationery sales",
        icon: ShoppingBag,
        match: "exact",
        action: ACTIONS.SALES_RECORD,
      },
      {
        href: "/sales/stationery/stock",
        label: "Stationery stock",
        icon: Package,
        match: "exact",
        action: ACTIONS.FEES_MANAGE,
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
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        match: "prefix",
        action: ACTIONS.SCHOOL_SETTINGS_READ,
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
