"use client";

import { api } from "@/lib/trpc/react";

export function useFeatureFlag(flagName: string) {
  const { data, isLoading, error } = api.featureFlag.isEnabled.useQuery(
    { name: flagName },
    {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Return false if error or no data
      select: (data) => data?.enabled ?? false,
    }
  );

  return {
    enabled: data ?? false,
    isLoading,
    error,
  };
}

export function useFeatureFlags() {
  const { data, isLoading, error } = api.featureFlag.listByTenant.useQuery();

  return {
    flags: data?.flags ?? [],
    isLoading,
    error,
  };
}
