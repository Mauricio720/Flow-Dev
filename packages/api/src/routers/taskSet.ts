import { mapTaskError } from "../controllers/taskErrorMapper";
import type { TaskSetController } from "../controllers/taskSetController";
import { taskSetGetInputSchema } from "../schemas/taskSet";
import { protectedProcedure, router } from "../trpc";

export function createTaskSetRouter(controller: () => TaskSetController) {
  return router({
    get: protectedProcedure.input(taskSetGetInputSchema).query(({ ctx, input }) => controller().get(ctx.principal, input).catch(mapTaskError)),
  });
}
