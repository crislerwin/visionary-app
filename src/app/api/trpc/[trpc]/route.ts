import { auth } from "@/auth";
import { appRouter, createTRPCContext } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  const session = await auth();

  // Read tenant from cookie or header (header takes precedence)
  const tenantCookie = req.cookies.get("current-tenant")?.value;
  const tenantHeader = req.headers.get("x-tenant-id");
  const tenantId = tenantHeader ?? tenantCookie ?? null;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        session,
        tenantId,
        headers: req.headers,
      }),
  });
};

export { handler as GET, handler as POST };
