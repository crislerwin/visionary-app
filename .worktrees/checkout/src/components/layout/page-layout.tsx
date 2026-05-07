import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * PageContainer — wrapper principal de toda página.
 * Usa os spacing tokens do tema para manter consistência.
 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn("p-3 md:p-6", className)}>{children}</div>;
}

/**
 * PageHeader — título + subtítulo + ação da página.
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6",
        className,
      )}
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
    </div>
  );
}

/**
 * ContentGrid — grid padrão para listas de cards (produtos, categorias, etc).
 */
interface ContentGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentGrid({ children, className }: ContentGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * EmptyState — estado vazio padronizado.
 */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>}
    </div>
  );
}
