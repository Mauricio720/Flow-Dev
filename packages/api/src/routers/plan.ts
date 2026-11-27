import { mapTaskError } from "../controllers/taskErrorMapper";
import type { ExecutionPlanController } from "../controllers/executionPlanController";
import type { PlanRunController } from "../controllers/planRunController";
import { planGetInputSchema, planRunChangeInputSchema, planRunStartInputSchema, planSaveInputSchema } from "../schemas/plan";
import { protectedProcedure, router } from "../trpc";

export function createPlanRouter(controller: () => ExecutionPlanController, runController: () => PlanRunController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    get: protectedProcedure.input(planGetInputSchema).query(({ ctx, input }) => call(() => controller().get(ctx.principal, input))),
    save: protectedProcedure.input(planSaveInputSchema).mutation(({ ctx, input }) => call(() => controller().save(ctx.principal, input))),
    run: router({
      start: protectedProcedure.input(planRunStartInputSchema).mutation(({ ctx, input }) => call(() => runController().start(ctx.principal, input))),
      pause: protectedProcedure.input(planRunChangeInputSchema).mutation(({ ctx, input }) => call(() => runController().pause(ctx.principal, input))),
      resume: protectedProcedure.input(planRunChangeInputSchema).mutation(({ ctx, input }) => call(() => runController().resume(ctx.principal, input))),
    }),
  });
}
