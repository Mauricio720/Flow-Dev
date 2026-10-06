import type { TaskSpecController } from "../controllers/taskSpecController";
import { mapSpecError } from "../controllers/specErrorMapper";
import { createProductionTaskSpecController } from "../infra/specComposition";
import { specAdjustInputSchema, specAnswerInputSchema, specApproveInputSchema, specCancelInputSchema, specDocumentInputSchema, specEventInputSchema, specEventsInputSchema, specPackageInputSchema, specPackagesInputSchema, specPermissionInputSchema, specRetryInputSchema, specReturnToReviewInputSchema, specScopeInputSchema, specStartInputSchema, specSubmissionInputSchema } from "../schemas/spec";
import { protectedProcedure, router } from "../trpc";

export function createTaskSpecRouter(controller?: TaskSpecController) {
  let production: TaskSpecController | undefined;
  const get = () => controller ?? (production ??= createProductionTaskSpecController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapSpecError);
  return router({
    byTask: protectedProcedure.input(specScopeInputSchema).query(({ ctx, input }) => call(() => get().byTask(ctx.principal, input))),
    events: protectedProcedure.input(specEventsInputSchema).query(({ ctx, input }) => call(() => get().events(ctx.principal, input))),
    event: protectedProcedure.input(specEventInputSchema).query(({ ctx, input }) => call(() => get().event(ctx.principal, input))),
    packages: protectedProcedure.input(specPackagesInputSchema).query(({ ctx, input }) => call(() => get().packages(ctx.principal, input))),
    package: protectedProcedure.input(specPackageInputSchema).query(({ ctx, input }) => call(() => get().package(ctx.principal, input))),
    document: protectedProcedure.input(specDocumentInputSchema).query(({ ctx, input }) => call(() => get().document(ctx.principal, input))),
    submission: protectedProcedure.input(specSubmissionInputSchema).query(({ ctx, input }) => call(() => get().submission(ctx.principal, input))),
    start: protectedProcedure.input(specStartInputSchema).mutation(({ ctx, input }) => call(() => get().start(ctx.principal, input))),
    adjust: protectedProcedure.input(specAdjustInputSchema).mutation(({ ctx, input }) => call(() => get().accept("spec.adjust", ctx.principal, { input, targets: { stage: input.stage, packageId: input.packageId } }))),
    answer: protectedProcedure.input(specAnswerInputSchema).mutation(({ ctx, input }) => call(() => get().answer(ctx.principal, input))),
    permission: protectedProcedure.input(specPermissionInputSchema).mutation(({ ctx, input }) => call(() => get().permission(ctx.principal, input))),
    cancel: protectedProcedure.input(specCancelInputSchema).mutation(({ ctx, input }) => call(() => get().accept("spec.cancel", ctx.principal, { input, targets: { attemptId: input.attemptId } }))),
    retry: protectedProcedure.input(specRetryInputSchema).mutation(({ ctx, input }) => call(() => get().accept("spec.retry", ctx.principal, { input, targets: { failedAttemptId: input.failedAttemptId } }))),
    returnToReview: protectedProcedure.input(specReturnToReviewInputSchema).mutation(({ ctx, input }) => call(() => get().accept("spec.returnToReview", ctx.principal, { input, targets: { failedAttemptId: input.failedAttemptId, packageId: input.packageId } }))),
    approve: protectedProcedure.input(specApproveInputSchema).mutation(({ ctx, input }) => call(() => get().accept("spec.approve", ctx.principal, { input, targets: { stage: input.stage, packageId: input.packageId } }))),
  });
}

export const taskSpecRouter = createTaskSpecRouter();
