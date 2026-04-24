import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { MenuClient } from "./menu-client";

interface MenuPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: MenuPageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  try {
    const tenant = await api.menu.getTenantBySlug({ slug: tenantSlug });
    return {
      title: `${tenant.name} - Cardápio`,
      description: tenant.description || `Cardápio de ${tenant.name}`,
    };
  } catch {
    return {
      title: "Cardápio",
      description: "Cardápio digital",
    };
  }
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { tenantSlug } = await params;

  let tenant;
  let categories;

  try {
    tenant = await api.menu.getTenantBySlug({ slug: tenantSlug });
    categories = await api.menu.getCategoriesWithProducts({ tenantSlug });
  } catch (error) {
    return notFound();
  }

  if (!tenant) {
    return notFound();
  }

  return <MenuClient tenant={tenant} categories={categories || []} />;
}
