"use client";

import { trpc } from "@/lib/trpc/react";
import type { MemberRole } from "@prisma/client";
import { useEffect } from "react";
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

const COOKIE_NAME = "current-tenant";

function setTenantCookie(tenantId: string | null) {
  if (tenantId) {
    document.cookie = `${COOKIE_NAME}=${tenantId};path=/;max-age=31536000`;
  } else {
    document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
  }
}

const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      currentTenantId: null,
      setCurrentTenant: (id) => {
        setTenantCookie(id);
        set({ currentTenantId: id });
      },
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

  // Sync cookie when tenant is restored from localStorage or auto-selected
  useEffect(() => {
    if (currentTenant?.id) {
      setTenantCookie(currentTenant.id);
    } else if (tenants && tenants.length === 0 && currentTenantId) {
      setCurrentTenant(null);
    }
  }, [currentTenant?.id, tenants, currentTenantId, setCurrentTenant]);

  return {
    currentTenant,
    currentRole: currentTenant?.role,
    setCurrentTenant,
    tenants: tenants as Tenant[] | undefined,
    isLoading,
  };
}
