import {
  Bell,
  CreditCard,
  Database,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  TrendingUp,
} from "lucide-react";

export interface NavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

export const sidebarNavigation: NavSection[] = [
  {
    items: [
      {
        titleKey: "dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    titleKey: "finance",
    items: [
      {
        titleKey: "extract",
        href: "/dashboard/transactions",
        icon: Receipt,
      },
      {
        titleKey: "dataSources",
        href: "/dashboard/data-sources",
        icon: Database,
      },
      {
        titleKey: "alerts",
        href: "/dashboard/alerts",
        icon: Bell,
      },
      {
        titleKey: "partnerInvoices",
        href: "/dashboard/partner-invoices",
        icon: CreditCard,
      },
    ],
  },
  {
    titleKey: "relationship",
    items: [
      {
        titleKey: "partners",
        href: "/dashboard/partners",
        icon: Handshake,
      },
      {
        titleKey: "partnerPerformance",
        href: "/dashboard/partners/performance",
        icon: TrendingUp,
      },
    ],
  },
];
