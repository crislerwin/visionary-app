"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

interface Category {
  id: string;
  name: string;
}

interface MenuSearchBarProps {
  categories: Category[];
  query: string;
  onQueryChange: (q: string) => void;
  activeCategory: string;
  onCategoryClick: (id: string) => void;
  colors?: {
    primary?: string;
    primaryText?: string;
  };
}

export function MenuSearchBar({
  categories,
  query,
  onQueryChange,
  activeCategory,
  onCategoryClick,
  colors,
}: MenuSearchBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Auto-scroll horizontal para manter a categoria ativa visível
  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeButton = buttonRefs.current[activeCategory];
    if (!container || !activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    const scrollLeft =
      buttonRect.left -
      containerRect.left +
      container.scrollLeft -
      containerRect.width / 2 +
      buttonRect.width / 2;

    container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: "smooth",
    });
  }, [activeCategory]);

  return (
    <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="py-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar prato, ingrediente..."
              className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
            />
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4"
        >
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            return (
              <button
                type="button"
                key={c.id}
                ref={(el) => {
                  buttonRefs.current[c.id] = el;
                }}
                onClick={() => onCategoryClick(c.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium transition-all ${
                  isActive
                    ? "shadow-[var(--shadow-soft)]"
                    : "bg-card text-muted-foreground border border-border hover:text-foreground hover:border-foreground/30"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: colors?.primary ?? "var(--foreground)",
                        color: colors?.primaryText ?? "var(--background)",
                      }
                    : undefined
                }
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
