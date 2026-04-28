import type { MemberRole } from "@prisma/client";
import {
  DollarSign,
  FolderOpen,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  requiredRole?: MemberRole;
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
    title: "Cardápio",
    items: [
      {
        title: "Produtos",
        href: "/dashboard/products",
        icon: Package,
        requiredRole: "ADMIN",
      },
      {
        title: "Categorias",
        href: "/dashboard/categories",
        icon: FolderOpen,
        requiredRole: "ADMIN",
      },
    ],
  },
  {
    title: "Operacional",
    items: [
      {
        title: "Pedidos",
        href: "/dashboard/orders",
        icon: ShoppingBag,
        requiredRole: "MEMBER",
      },
      {
        title: "Caixa",
        href: "/dashboard/cash-register",
        icon: DollarSign,
        requiredRole: "ADMIN",
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        title: "Marca",
        href: "/dashboard/settings/branding",
        icon: Settings,
        requiredRole: "ADMIN",
      },
    ],
  },
];
