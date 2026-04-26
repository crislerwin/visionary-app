import { ProductCard } from "@/components/menu/product-card";
import type { Product } from "@/components/menu/product-card";

interface CategorySectionProps {
  category: {
    id: string;
    name: string;
    products: Product[];
  };
  tenantSlug: string;
  tenantName: string;
}

export function CategorySection({ category, tenantSlug, tenantName }: CategorySectionProps) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-4">{category.name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 items-stretch">
        {category.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tenantSlug={tenantSlug}
            tenantName={tenantName}
          />
        ))}
      </div>
    </section>
  );
}
