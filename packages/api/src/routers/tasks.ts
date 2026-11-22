import { TasksController, mapTaskError } from "../controllers/tasksController";
import { createProductionTasksController } from "../infra/composition";
import { taskListInputSchema, taskMessagesInputSchema, taskRevisionsInputSchema, taskResolveRefinementInputSchema, taskRetryInputSchema, taskSaveDraftInputSchema, taskSendInputSchema, taskStartInputSchema, taskSubmissionInputSchema } from "../schemas/tasks";
import { protectedProcedure, router } from "../trpc";
import { TaskPublicationController } from "../controllers/taskPublicationController";
import { createProductionTaskPublicationController } from "../infra/composition";
import { createProductionTaskPlanningController } from "../infra/planningComposition";
import type { TaskPlanningController } from "../controllers/taskPlanningController";
import { createTaskPlanningRouter } from "./taskPlanning";
import { createTerminalRouter } from "./terminal";
import type { TerminalSessionController } from "../controllers/terminalSessionController";
import { createProductionTerminalController } from "../infra/terminalComposition";
import { taskPreviewInputSchema, taskPublishInputSchema, taskReconcilePublicationInputSchema } from "../schemas/tasks";

export type TasksRouterExtras = { planning?: TaskPlanningController; terminal?: TerminalSessionController };

export function createTasksRouter(controller?: TasksController, publicationController?: TaskPublicationController, extras: TasksRouterExtras = {}) {
  let production: TasksController | undefined;
  let publication: TaskPublicationController | undefined;
  const getController = () => controller ?? (production ??= createProductionTasksController());
  const getPublicationController = () => publicationController ?? (publication ??= createProductionTaskPublicationController());
  let planning: TaskPlanningController | undefined;
  const getPlanningController = () => extras.planning ?? (planning ??= createProductionTaskPlanningController());
  let terminal: TerminalSessionController | undefined;
  const getTerminalController = () => extras.terminal ?? (terminal ??= createProductionTerminalController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    list: protectedProcedure.input(taskListInputSchema).query(({ ctx, input }) => call(() => getController().list(ctx.principal, input))),
    byId: protectedProcedure.input(taskMessagesInputSchema.pick({ projectId: true, taskId: true })).query(({ ctx, input }) => call(() => getController().byId(ctx.principal, input))),
    messages: protectedProcedure.input(taskMessagesInputSchema).query(({ ctx, input }) => call(() => getController().messages(ctx.principal, input))),
    revisions: protectedProcedure.input(taskRevisionsInputSchema).query(({ ctx, input }) => call(() => getController().revisions(ctx.principal, input))),
    start: protectedProcedure.input(taskStartInputSchema).mutation(({ ctx, input }) => call(() => getController().start(ctx.principal, input))),
    send: protectedProcedure.input(taskSendInputSchema).mutation(({ ctx, input }) => call(() => getController().send(ctx.principal, input))),
    retryGeneration: protectedProcedure.input(taskRetryInputSchema).mutation(({ ctx, input }) => call(() => getController().retryGeneration(ctx.principal, input))),
    submission: protectedProcedure.input(taskSubmissionInputSchema).query(({ ctx, input }) => call(() => getController().submission(ctx.principal, input))),
    saveDraft: protectedProcedure.input(taskSaveDraftInputSchema).mutation(({ ctx, input }) => call(() => getController().saveDraft(ctx.principal, input))),
    resolveRefinement: protectedProcedure.input(taskResolveRefinementInputSchema).mutation(({ ctx, input }) => call(() => getController().resolveRefinement(ctx.principal, input))),
    preview: protectedProcedure.input(taskPreviewInputSchema).query(({ ctx, input }) => call(() => getPublicationController().preview(ctx.principal, input))),
    publish: protectedProcedure.input(taskPublishInputSchema).mutation(({ ctx, input }) => call(() => getPublicationController().publish(ctx.principal, input))),
    planning: createTaskPlanningRouter(getPlanningController),
    terminal: createTerminalRouter(getTerminalController),
    reconcilePublication: protectedProcedure.input(taskReconcilePublicationInputSchema).mutation(({ ctx, input }) => call(() => getPublicationController().reconcilePublication(ctx.principal, input))),
  });
}

export const tasksRouter = createTasksRouter();
