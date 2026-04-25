import { api } from "@/lib/trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  let tenant: Awaited<ReturnType<typeof api.menu.getTenantBySlug>> | undefined;
  let categories: Awaited<ReturnType<typeof api.menu.getCategoriesWithProducts>> | undefined;

  try {
    tenant = await api.menu.getTenantBySlug({ slug: tenantSlug });
    categories = await api.menu.getCategoriesWithProducts({ tenantSlug });
  } catch (_error) {
    return notFound();
  }

  if (!tenant) {
    return notFound();
  }

  return <MenuClient tenant={tenant} categories={categories || []} />;
}
