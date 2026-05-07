import { Database, LayoutDashboard, type LucideIcon, Settings } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const sidebarNavigation: NavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Data Sources",
        href: "/dashboard/data-sources",
        icon: Database,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
