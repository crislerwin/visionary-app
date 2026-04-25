import {
  DollarSign,
  FolderOpen,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Store,
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
    title: "Cardápio",
    items: [
      {
        title: "Produtos",
        href: "/dashboard/products",
        icon: Package,
      },
      {
        title: "Categorias",
        href: "/dashboard/categories",
        icon: FolderOpen,
      },
      {
        title: "Ver Cardápio",
        href: "/menu",
        icon: Store,
      },
    ],
  },
  {
    title: "Operacional",
    items: [
      {
        title: "Caixa",
        href: "/dashboard/cash-register",
        icon: DollarSign,
      },
    ],
  },
];
