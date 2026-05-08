import { createCaller, createTRPCInnerContext } from "@/server/routers/_app";
import type { Session } from "next-auth";

// Create server-side caller without session (for public routes)
export const api = createCaller(createTRPCInnerContext());

// Create server-side caller with session
export async function createServerCaller(session: Session | null, tenantId?: string | null) {
  return createCaller(createTRPCInnerContext({ session, tenantId }));
}
