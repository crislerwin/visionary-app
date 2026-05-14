import {
  Database,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  TrendingUp,
} from "lucide-react";

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
        title: "Extrato",
        href: "/dashboard/transactions",
        icon: Receipt,
      },
      {
        title: "Previsão",
        href: "/dashboard/cashflow-forecast",
        icon: TrendingUp,
      },
      {
        title: "Data Sources",
        href: "/dashboard/data-sources",
        icon: Database,
      },
    ],
  },
  {
    title: "Relacionamento",
    items: [
      {
        title: "Parceiros",
        href: "/dashboard/partners",
        icon: Handshake,
      },
    ],
  },
];
