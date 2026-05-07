import { FileText, Landmark, LayoutDashboard, type LucideIcon, Settings, Users } from "lucide-react";

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
        title: "Accounts",
        href: "/dashboard/accounts",
        icon: Landmark,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Posts",
        href: "/dashboard/posts",
        icon: FileText,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Team",
        href: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
