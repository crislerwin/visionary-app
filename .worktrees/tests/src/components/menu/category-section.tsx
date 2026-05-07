import { ProductCard } from "@/components/menu/product-card";
import type { Product } from "@/components/menu/product-card";
import { Tag } from "lucide-react";

interface CategorySectionProps {
  category: {
    id: string;
    name: string;
    image: string | null;
    products: Product[];
  };
  tenantSlug: string;
  tenantName: string;
  tenantId: string;
}

export function CategorySection({
  category,
  tenantSlug,
  tenantName,
  tenantId,
}: CategorySectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="h-6 w-6 rounded-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <Tag className="h-5 w-5 text-muted-foreground" />
        )}
        <h2 className="text-lg font-bold">{category.name}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 items-stretch">
        {category.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            tenantSlug={tenantSlug}
            tenantName={tenantName}
            tenantId={tenantId}
          />
        ))}
      </div>
    </section>
  );
}
