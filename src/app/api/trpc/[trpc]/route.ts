import { appRouter, createTRPCContext } from "@/server/routers/_app";
import { auth } from "@/auth";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  const session = await auth();
  
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ session }),
  });
};

export { handler as GET, handler as POST };
