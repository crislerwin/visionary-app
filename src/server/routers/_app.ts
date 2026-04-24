import { createCallerFactory, router } from "@/lib/trpc/trpc";
import { authRouter } from "./auth";
import { tenantRouter } from "./tenant";
import { teamRouter } from "./team";
import { postRouter } from "./post";
import { userRouter } from "./user";
import { auth } from "@/auth";
import { cookies } from "next/headers";

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  team: teamRouter,
  post: postRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export { createTRPCContext };
