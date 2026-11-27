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
import { createArtifactsRouter } from "./artifacts";
import { createTaskSetRouter } from "./taskSet";
import { createPlanRouter } from "./plan";
import type { ExecutionPlanController } from "../controllers/executionPlanController";
import { createProductionPlanController } from "../infra/planComposition";
import type { TaskSetController } from "../controllers/taskSetController";
import { createProductionTaskSetController } from "../infra/taskSetComposition";
import type { TaskArtifactController } from "../controllers/taskArtifactController";
import { createProductionArtifactController } from "../infra/artifactComposition";
import type { TerminalSessionController } from "../controllers/terminalSessionController";
import { createProductionTerminalController } from "../infra/terminalComposition";
import type { ReviewCycleController } from "../controllers/reviewCycleController";
import { createProductionReviewController } from "../infra/reviewComposition";
import { createReviewRouter } from "./review";
import { createProductionSessionControllers, type SessionControllers } from "../infra/sessionInteractionComposition";
import { createSessionRouter } from "./session";
import { lazyController } from "./lazyController";
import type { WorktreeChoiceController } from "../controllers/worktreeChoiceController";
import { createProductionWorktreeController } from "../infra/worktreeComposition";
import { createWorktreeRouter } from "./worktree";
import { taskPreviewInputSchema, taskPublishInputSchema, taskReconcilePublicationInputSchema } from "../schemas/tasks";
import { createWorkAccountsRouter } from "./workAccounts";
import type { WorkAccountController } from "../controllers/workAccountController";
import { createProductionWorkAccountController } from "../infra/agentAccountComposition";

export type TasksRouterExtras = { planning?: TaskPlanningController; terminal?: TerminalSessionController; artifacts?: TaskArtifactController; session?: SessionControllers; taskSet?: TaskSetController; plan?: ExecutionPlanController; review?: ReviewCycleController; worktree?: WorktreeChoiceController; workAccounts?: WorkAccountController };

export function createTasksRouter(controller?: TasksController, publicationController?: TaskPublicationController, extras: TasksRouterExtras = {}) {
  const getController = lazyController(controller, createProductionTasksController);
  const getPublicationController = lazyController(publicationController, createProductionTaskPublicationController);
  const getPlanningController = lazyController(extras.planning, createProductionTaskPlanningController);
  const getTerminalController = lazyController(extras.terminal, createProductionTerminalController);
  const getSessionController = lazyController(extras.session, createProductionSessionControllers);
  const getArtifactController = lazyController(extras.artifacts, createProductionArtifactController);
  const getTaskSetController = lazyController(extras.taskSet, createProductionTaskSetController);
  const getPlanController = lazyController(extras.plan, createProductionPlanController);
  const getReviewController = lazyController(extras.review, createProductionReviewController);
  const getWorktreeController = lazyController(extras.worktree, createProductionWorktreeController);
  const getWorkAccountController = lazyController(extras.workAccounts, createProductionWorkAccountController);
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
    artifacts: createArtifactsRouter(getArtifactController),
    taskSet: createTaskSetRouter(getTaskSetController),
    plan: createPlanRouter(getPlanController),
    review: createReviewRouter(getReviewController),
    session: createSessionRouter(getSessionController),
    worktree: createWorktreeRouter(getWorktreeController),
    workAccounts: createWorkAccountsRouter(getWorkAccountController),
    reconcilePublication: protectedProcedure.input(taskReconcilePublicationInputSchema).mutation(({ ctx, input }) => call(() => getPublicationController().reconcilePublication(ctx.principal, input))),
  });
}

export const tasksRouter = createTasksRouter();
