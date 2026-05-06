"use client";

import type { AppRouter } from "@/server/routers/_app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";

const trpc = createTRPCReact<AppRouter>();

function getTenantIdFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;)\s*current-tenant=([^;]*)/);
  return match?.[1] ?? null;
}

function getTenantIdFromStorage(): string | null {
  try {
    const raw = localStorage.getItem("tenant-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.currentTenantId ?? null;
  } catch {
    return null;
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers() {
            const tenantId = getTenantIdFromCookie() || getTenantIdFromStorage();
            return tenantId ? { "x-tenant-id": tenantId } : {};
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export { trpc as api };
export { trpc };
