import { protectedProcedure, router } from "../trpc";
import type { TaskExecutionController } from "../controllers/taskExecutionController";
import { mapTaskError } from "../controllers/taskErrorMapper";
import { taskExecutionCancelSchema, taskExecutionStartSchema, taskExecutionStatusSchema } from "../schemas/execution";

export function createTaskExecutionRouter(controller?: TaskExecutionController) {
  let production: TaskExecutionController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/executionComposition")).createProductionTaskExecutionController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    status: protectedProcedure.input(taskExecutionStatusSchema).query(async ({ ctx, input }) => call(async () => (await get()).status(ctx.principal, input))),
    start: protectedProcedure.input(taskExecutionStartSchema).mutation(async ({ ctx, input }) => call(async () => (await get()).start(ctx.principal, input))),
    cancel: protectedProcedure.input(taskExecutionCancelSchema).mutation(async ({ ctx, input }) => call(async () => (await get()).cancel(ctx.principal, input))),
  });
}

export const taskExecutionRouter = createTaskExecutionRouter();
