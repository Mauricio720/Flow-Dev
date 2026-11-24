import { mapTaskError } from "../controllers/taskErrorMapper";
import type { ExecutionPlanController } from "../controllers/executionPlanController";
import { planGetInputSchema, planSaveInputSchema } from "../schemas/plan";
import { protectedProcedure, router } from "../trpc";

export function createPlanRouter(controller: () => ExecutionPlanController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    get: protectedProcedure.input(planGetInputSchema).query(({ ctx, input }) => call(() => controller().get(ctx.principal, input))),
    save: protectedProcedure.input(planSaveInputSchema).mutation(({ ctx, input }) => call(() => controller().save(ctx.principal, input))),
  });
}
