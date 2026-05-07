import { createCallerFactory, createTRPCContext, router } from "@/lib/trpc/trpc";
import { authRouter } from "./auth";
import { bankAccountRouter } from "./bankAccount";
import { categoryRouter } from "./category";
import { pluggyRouter } from "./pluggy";
import { postRouter } from "./post";
import { teamRouter } from "./team";
import { tenantRouter } from "./tenant";
import { transactionRouter } from "./transaction";
import { userRouter } from "./user";

export const appRouter = router({
  auth: authRouter,
  tenant: tenantRouter,
  team: teamRouter,
  post: postRouter,
  user: userRouter,
  transaction: transactionRouter,
  bankAccount: bankAccountRouter,
  category: categoryRouter,
  pluggy: pluggyRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export { createTRPCContext };
