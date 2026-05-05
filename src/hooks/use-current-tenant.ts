"use client";

import { trpc } from "@/lib/trpc/react";
import type { MemberRole } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  role?: MemberRole;
}

interface TenantStore {
  currentTenantId: string | null;
  setCurrentTenant: (id: string | null) => void;
}

const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      currentTenantId: null,
      setCurrentTenant: (id) => set({ currentTenantId: id }),
    }),
    {
      name: "tenant-storage",
    },
  ),
);

export function useCurrentTenant(): {
  currentTenant: Tenant | null;
  currentRole: MemberRole | undefined;
  setCurrentTenant: (id: string | null) => void;
  tenants: Tenant[] | undefined;
  isLoading: boolean;
} {
  const { currentTenantId, setCurrentTenant } = useTenantStore();
  const { data, isLoading } = trpc.tenant.list.useQuery();

  // Cast to break deep type instantiation from zustand + tRPC interaction
  const tenants = data as Tenant[] | undefined;

  const currentTenant: Tenant | null =
    tenants?.find((t) => t.id === currentTenantId) || tenants?.[0] || null;

  return {
    currentTenant,
    currentRole: currentTenant?.role,
    setCurrentTenant,
    tenants: tenants as Tenant[] | undefined,
    isLoading,
  };
}
