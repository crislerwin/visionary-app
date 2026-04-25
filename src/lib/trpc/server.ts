import { createCaller, createTRPCContext } from "@/server/routers/_app";

// Create server-side caller without session (for public routes)
export const api = createCaller(createTRPCContext({}));
