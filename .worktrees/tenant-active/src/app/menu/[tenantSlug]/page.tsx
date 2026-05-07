import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuClient } from "./menu-client";

interface MenuPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: MenuPageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true },
      select: { name: true, description: true },
    });
    return {
      title: `${tenant?.name ?? "Cardápio"} - Meu Rango`,
      description: tenant?.description || `Cardápio de ${tenant?.name ?? ""}`,
    };
  } catch {
    return {
      title: "Meu Rango",
      description: "Cardápio digital",
    };
  }
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      whatsappPhone: true,
      config: true,
    },
  });

  if (!tenant) {
    return notFound();
  }

  const categories = await prisma.category.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      isDeleted: false,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: {
          isActive: true,
          isDeleted: false,
        },
        orderBy: { name: "asc" },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { price: "asc" },
          },
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  // Filter out categories with no products
  const categoriesWithProducts = categories.filter((cat) => cat.products.length > 0);

  // Convert Decimal prices to numbers and serialize config safely
  const serializedCategories = categoriesWithProducts.map((category) => ({
    ...category,
    products: category.products.map((product) => ({
      ...product,
      price: Number(product.price),
      variants: product.variants.map((variant) => ({
        ...variant,
        price: Number(variant.price),
      })),
    })),
  }));

  const serializedTenant = {
    ...tenant,
    config: tenant.config as Record<string, unknown> | null,
  };

  return <MenuClient tenant={serializedTenant} categories={serializedCategories} />;
}
