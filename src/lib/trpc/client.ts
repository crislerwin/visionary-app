import { httpBatchLink } from "@trpc/client"

import { trpc } from "./react"

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
})
