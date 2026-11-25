import { mapTaskError } from "../controllers/taskErrorMapper";
import type { ReviewCycleController } from "../controllers/reviewCycleController";
import { reviewGetInputSchema, reviewRequestInputSchema, reviewStartInputSchema } from "../schemas/review";
import { protectedProcedure, router } from "../trpc";

export function createReviewRouter(controller: () => ReviewCycleController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    get: protectedProcedure.input(reviewGetInputSchema).query(({ ctx, input }) => call(() => controller().get(ctx.principal, input))),
    start: protectedProcedure.input(reviewStartInputSchema).mutation(({ ctx, input }) => call(() => controller().start(ctx.principal, input))),
    request: protectedProcedure.input(reviewRequestInputSchema).mutation(({ ctx, input }) => call(() => controller().request(ctx.principal, input))),
  });
}
