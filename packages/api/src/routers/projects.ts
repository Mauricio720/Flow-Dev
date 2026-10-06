import { ProjectsController, mapProjectError } from "../controllers/projectsController";
import { connectionStatesInputSchema, createProjectInputSchema, projectIdSchema, projectListInputSchema, repositoryCandidatesInputSchema, repositoryPreviewInputSchema, updateProjectBoardInputSchema, updateProjectDetailsInputSchema } from "../schemas/projects";
import { protectedProcedure, router } from "../trpc";
import { createProductionProjectsController } from "../infra/composition";

export function createProjectsRouter(controller?: ProjectsController) {
  let production: ProjectsController | undefined;
  const getController = () => controller ?? (production ??= createProductionProjectsController());
  return router({
    list: protectedProcedure.input(projectListInputSchema).query(({ ctx, input }) => getController().list(ctx.principal, input).catch(mapProjectError)),
    byId: protectedProcedure.input(projectIdSchema).query(({ ctx, input }) => getController().byId(ctx.principal, input.projectId).catch(mapProjectError)),
    select: protectedProcedure.input(projectIdSchema).mutation(({ ctx, input }) => getController().select(ctx.principal, input.projectId).catch(mapProjectError)),
    repositoryCandidates: protectedProcedure.input(repositoryCandidatesInputSchema).query(({ ctx, input }) => getController().candidates(ctx.principal, input).catch(mapProjectError)),
    repositoryPreview: protectedProcedure.input(repositoryPreviewInputSchema).query(({ ctx, input }) => getController().preview(ctx.principal, input).catch(mapProjectError)),
    create: protectedProcedure.input(createProjectInputSchema).mutation(({ ctx, input }) => getController().create(ctx.principal, input).catch(mapProjectError)),
    updateDetails: protectedProcedure.input(updateProjectDetailsInputSchema).mutation(({ ctx, input }) => getController().updateDetails(ctx.principal, input).catch(mapProjectError)),
    updateBoard: protectedProcedure.input(updateProjectBoardInputSchema).mutation(({ ctx, input }) => getController().updateBoard(ctx.principal, input).catch(mapProjectError)),
    connectionStates: protectedProcedure.input(connectionStatesInputSchema).query(({ ctx, input }) => getController().connectionStates(ctx.principal, input.projectIds).catch(mapProjectError)),
    repositoryContext: protectedProcedure.input(projectIdSchema).query(({ ctx, input }) => getController().repositoryContext(ctx.principal, input.projectId).catch(mapProjectError)),
  });
}

export const projectsRouter = createProjectsRouter();
