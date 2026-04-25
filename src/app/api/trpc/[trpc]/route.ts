import { auth } from "@/auth";
import { appRouter, createTRPCContext } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  const session = await auth();

  // Get tenantId from session (user's active tenant)
  const tenantId = session?.user?.id ? await getUserTenantId(session.user.id) : null;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ session, tenantId }),
  });
};

async function getUserTenantId(userId: string): Promise<string | null> {
  // Import prisma dynamically to avoid issues
  const { prisma } = await import("@/lib/db");

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { joinedAt: "desc" },
  });

  return membership?.tenantId ?? null;
}

export { handler as GET, handler as POST };
