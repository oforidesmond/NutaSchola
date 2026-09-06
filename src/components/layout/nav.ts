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
  UserPlus,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match exactly, or treat as prefix for nested routes */
  match?: "exact" | "prefix";
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
      },
      {
        href: "/admissions/applications",
        label: "Applications",
        icon: FileText,
        match: "prefix",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { href: "/settings/school", label: "School", icon: School, match: "exact" },
      {
        href: "/settings/academic",
        label: "Academic years",
        icon: CalendarRange,
        match: "exact",
      },
      {
        href: "/settings/classes",
        label: "Classes & sections",
        icon: Layers,
        match: "exact",
      },
      {
        href: "/settings/subjects",
        label: "Subjects",
        icon: BookOpen,
        match: "exact",
      },
      { href: "/settings/fees", label: "Fees", icon: Wallet, match: "exact" },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    items: [
      { href: "/staff/invite", label: "Invite", icon: UserPlus, match: "exact" },
    ],
  },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
