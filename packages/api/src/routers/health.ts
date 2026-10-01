import { healthController, type HealthController } from "../controllers/healthController";
import { publicProcedure, router } from "../trpc";

export function createHealthRouter(controller: HealthController = healthController) {
  return router({
    check: publicProcedure.query(({ ctx }) => controller.check(ctx.requestId)),
  });
}

export const healthRouter = createHealthRouter();
