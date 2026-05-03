import { createCallerFactory, createTRPCContext, router } from "@/lib/trpc/trpc";
import { authRouter } from "./auth";
import { cashRegisterRouter } from "./cash-register";
import { categoryRouter } from "./category";
import { leadRouter } from "./lead";
import { likeRouter } from "./like";
import { orderRouter } from "./order";
import { productRouter } from "./product";
import { productImageRouter } from "./product-image";
import { publicRouter } from "./public";
import { teamRouter } from "./team";
import { tenantRouter } from "./tenant";
import { userRouter } from "./user";

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  team: teamRouter,
  lead: leadRouter,
  like: likeRouter,
  user: userRouter,
  category: categoryRouter,
  product: productRouter,
  productImage: productImageRouter,
  public: publicRouter,
  order: orderRouter,
  cashRegister: cashRegisterRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export { createTRPCContext };
