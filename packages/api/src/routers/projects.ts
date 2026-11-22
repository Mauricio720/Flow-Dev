import { AgentSettingsController, mapAgentSettingsError } from "../controllers/agentSettingsController";
import { LocalCheckoutController } from "../controllers/localCheckoutController";
import { mapLocalCheckoutError } from "../controllers/localCheckoutErrorMapper";
import { ProjectsController, mapProjectError } from "../controllers/projectsController";
import { localCheckoutSaveInputSchema } from "../schemas/localCheckout";
import { agentSettingsUpdateInputSchema } from "../schemas/agentSettings";
import { connectionStatesInputSchema, createProjectInputSchema, projectIdSchema, projectListInputSchema, repositoryCandidatesInputSchema, repositoryPreviewInputSchema, updateProjectBoardInputSchema, updateProjectDetailsInputSchema } from "../schemas/projects";
import { protectedProcedure, router } from "../trpc";
import { createProductionAgentSettingsController, createProductionLocalCheckoutController, createProductionProjectsController } from "../infra/composition";

export function createProjectsRouter(controller?: ProjectsController, agentSettingsController?: AgentSettingsController, localCheckoutController?: LocalCheckoutController) {
  let production: ProjectsController | undefined;
  let productionAgentSettings: AgentSettingsController | undefined;
  let productionLocalCheckout: LocalCheckoutController | undefined;
  const getController = () => controller ?? (production ??= createProductionProjectsController());
  const getAgentSettings = () => agentSettingsController ?? (productionAgentSettings ??= createProductionAgentSettingsController());
  const getLocalCheckout = () => localCheckoutController ?? (productionLocalCheckout ??= createProductionLocalCheckoutController());
  return router({
    localCheckout: router({
      get: protectedProcedure.input(projectIdSchema).query(({ ctx, input }) => getLocalCheckout().get(ctx.principal, input.projectId).catch(mapLocalCheckoutError)),
      save: protectedProcedure.input(localCheckoutSaveInputSchema).mutation(({ ctx, input }) => getLocalCheckout().save(ctx.principal, input).catch(mapLocalCheckoutError)),
      remove: protectedProcedure.input(projectIdSchema).mutation(({ ctx, input }) => getLocalCheckout().remove(ctx.principal, input.projectId).catch(mapLocalCheckoutError)),
    }),
    agentSettings: router({
      get: protectedProcedure.input(projectIdSchema).query(({ ctx, input }) => getAgentSettings().get(ctx.principal, input.projectId).catch(mapAgentSettingsError)),
      update: protectedProcedure.input(agentSettingsUpdateInputSchema).mutation(({ ctx, input }) => getAgentSettings().update(ctx.principal, input).catch(mapAgentSettingsError)),
    }),
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
