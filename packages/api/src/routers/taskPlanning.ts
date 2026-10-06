import type { TaskPlanningController } from "../controllers/taskPlanningController";
import { mapTaskError } from "../controllers/taskErrorMapper";
import { planningApprovalInputSchema, planningCommandInputSchema, planningRetryInputSchema, planningSelectionInputSchema, planningSubmissionInputSchema } from "../schemas/planning";
import { protectedProcedure, router } from "../trpc";

export function createTaskPlanningRouter(controller: () => TaskPlanningController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    start: protectedProcedure.input(planningCommandInputSchema).mutation(({ ctx, input }) => call(() => controller().start(ctx.principal, input))),
    retry: protectedProcedure.input(planningRetryInputSchema).mutation(({ ctx, input }) => call(() => controller().retry(ctx.principal, input))),
    selectRoute: protectedProcedure.input(planningSelectionInputSchema).mutation(({ ctx, input }) => call(() => controller().selectRoute(ctx.principal, input))),
    approve: protectedProcedure.input(planningApprovalInputSchema).mutation(({ ctx, input }) => call(() => controller().approve(ctx.principal, input))),
    submission: protectedProcedure.input(planningSubmissionInputSchema).query(({ ctx, input }) => call(() => controller().submission(ctx.principal, input))),
  });
}
