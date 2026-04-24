"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { trpc } from "@/lib/trpc/react"

interface Tenant {
  id: string
  name: string
  slug: string
  image: string | null
}

interface TenantStore {
  currentTenantId: string | null
  setCurrentTenant: (id: string | null) => void
}

const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      currentTenantId: null,
      setCurrentTenant: (id) => set({ currentTenantId: id }),
    }),
    {
      name: "tenant-storage",
    }
  )
)

export function useCurrentTenant(): {
  currentTenant: Tenant | null
  setCurrentTenant: (id: string | null) => void
  tenants: Tenant[] | undefined
  isLoading: boolean
} {
  const { currentTenantId, setCurrentTenant } = useTenantStore()
  const { data: tenants, isLoading } = trpc.tenant.list.useQuery()

  const currentTenant = tenants?.find((t: Tenant) => t.id === currentTenantId) || tenants?.[0] || null

  return {
    currentTenant,
    setCurrentTenant,
    tenants,
    isLoading,
  }
}
