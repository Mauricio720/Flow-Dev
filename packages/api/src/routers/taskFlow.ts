import type { TaskFlowController } from "../controllers/taskFlowController";
import { mapTaskFlowError } from "../controllers/taskFlowErrorMapper";
import { answerRunQuestionSchema, approvePackageSchema, cancelRunSchema, retryActionSchema, moveActionSchema, packageScopeSchema, runQuestionsSchema, savePlanSchema, startActionSchema, taskFlowRunsSchema, taskFlowScopeSchema, prepareLocalActionSchema, localPreparationStatusSchema, taskFlowGatesSchema, taskFlowEvidenceSchema } from "../schemas/taskFlow";
import { protectedProcedure, router } from "../trpc";

export function createTaskFlowRouter(controller?: TaskFlowController) {
  let production: TaskFlowController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/taskFlowComposition")).createProductionTaskFlowController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskFlowError);
  return router({
    options: protectedProcedure.input(taskFlowScopeSchema).query(({ ctx, input }) => call(async () => (await get()).options(ctx.principal, input))),
    byTask: protectedProcedure.input(taskFlowScopeSchema).query(({ ctx, input }) => call(async () => (await get()).byTask(ctx.principal, input))),
    runs: protectedProcedure.input(taskFlowRunsSchema).query(({ ctx, input }) => call(async () => (await get()).runs(ctx.principal, input))),
    questions: protectedProcedure.input(runQuestionsSchema).query(({ ctx, input }) => call(async () => (await get()).questions(ctx.principal, input))),
    answerQuestion: protectedProcedure.input(answerRunQuestionSchema).mutation(({ ctx, input }) => call(async () => (await get()).answerQuestion(ctx.principal, input))),
    package: protectedProcedure.input(packageScopeSchema).query(({ ctx, input }) => call(async () => (await get()).packageDocuments(ctx.principal, input))),
    approvePackage: protectedProcedure.input(approvePackageSchema).mutation(({ ctx, input }) => call(async () => (await get()).approvePackage(ctx.principal, input))),
    cancelRun: protectedProcedure.input(cancelRunSchema).mutation(({ ctx, input }) => call(async () => (await get()).cancelRun(ctx.principal, input))),
    retryAction: protectedProcedure.input(retryActionSchema).mutation(({ ctx, input }) => call(async () => (await get()).retryAction(ctx.principal, input))),
    moveAction: protectedProcedure.input(moveActionSchema).mutation(({ ctx, input }) => call(async () => (await get()).moveAction(ctx.principal, input))),
    savePlan: protectedProcedure.input(savePlanSchema).mutation(({ ctx, input }) => call(async () => (await get()).savePlan(ctx.principal, input))),
    startAction: protectedProcedure.input(startActionSchema).mutation(({ ctx, input }) => call(async () => (await get()).startAction(ctx.principal, input))),
    prepareLocalAction: protectedProcedure.input(prepareLocalActionSchema).mutation(({ ctx, input }) => call(async () => (await get()).prepareLocalAction(ctx.principal, input))),
    localPreparationStatus: protectedProcedure.input(localPreparationStatusSchema).query(({ ctx, input }) => call(async () => (await get()).localPreparationStatus(ctx.principal, input))),
    gates: protectedProcedure.input(taskFlowGatesSchema).query(({ ctx, input }) => call(async () => (await get()).gates(ctx.principal, input))),
    evidence: protectedProcedure.input(taskFlowEvidenceSchema).query(({ ctx, input }) => call(async () => (await get()).evidence(ctx.principal, input))),
  });
}

export const taskFlowRouter = createTaskFlowRouter();
