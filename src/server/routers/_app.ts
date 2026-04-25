import { createCallerFactory, createTRPCContext, router } from "@/lib/trpc/trpc";
import { authRouter } from "./auth";
import { categoryRouter } from "./category";
import { menuRouter } from "./menu";
import { orderRouter } from "./order";
import { productRouter } from "./product";
import { teamRouter } from "./team";
import { tenantRouter } from "./tenant";
import { userRouter } from "./user";

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  team: teamRouter,
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  menu: menuRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export { createTRPCContext };
