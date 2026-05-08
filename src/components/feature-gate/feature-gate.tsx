"use client";

import { ReactNode } from "react";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

export function FeatureGate({
  flag,
  children,
  fallback = null,
  loadingComponent,
}: FeatureGateProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading) {
    if (loadingComponent) {
      return loadingComponent;
    }
    return <Skeleton className="h-8 w-full" />;
  }

  if (!enabled) {
    return fallback;
  }

  return children;
}

// Hook for checking multiple flags
export function useFeatureFlagsEnabled(flagNames: string[]) {
  const results = flagNames.map((name) => useFeatureFlag(name));

  const allEnabled = results.every((r) => r.enabled);
  const anyEnabled = results.some((r) => r.enabled);
  const isLoading = results.some((r) => r.isLoading);

  return {
    allEnabled,
    anyEnabled,
    isLoading,
    flags: results.reduce((acc, r, i) => {
      acc[flagNames[i]] = r.enabled;
      return acc;
    }, {} as Record<string, boolean>),
  };
}
