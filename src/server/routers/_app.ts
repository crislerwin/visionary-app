import { createCallerFactory, createTRPCContext, router } from "@/lib/trpc/trpc";
import { authRouter } from "./auth";
import { categoryRouter } from "./category";
import { orderRouter } from "./order";
import { postRouter } from "./post";
import { productRouter } from "./product";
import { teamRouter } from "./team";
import { tenantRouter } from "./tenant";
import { userRouter } from "./user";

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  team: teamRouter,
  post: postRouter,
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export { createTRPCContext };
