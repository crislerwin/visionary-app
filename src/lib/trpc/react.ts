"use client"

import { createTRPCReact } from "@trpc/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useState } from "react"
import type { AppRouter } from "@/server/routers/_app"

const trpc = createTRPCReact<AppRouter>()
const TrpcProvider = trpc.Provider

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  )

  return (
    <TrpcProvider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TrpcProvider>
  )
}

export { trpc }
