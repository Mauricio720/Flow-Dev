import type { LocalLinkRequestController } from "../controllers/localLinkRequestController";
import type { LocalProjectLinkController } from "../controllers/localProjectLinkController";
import { mapLocalExecutionError } from "../controllers/localExecutionErrorMapper";
import { localProjectLinkRequestSchema, localProjectMineSchema, localProjectUnlinkSchema } from "../schemas/localProjects";
import { protectedProcedure, router } from "../trpc";

export function createLocalProjectsRouter(controller?: LocalProjectLinkController, requestController?: LocalLinkRequestController) {
  let production: LocalProjectLinkController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/localMachineComposition")).createProductionLocalProjectLinkController());
  let productionRequests: LocalLinkRequestController | undefined;
  const requests = async () => requestController ?? (productionRequests ??= (await import("../infra/localMachineComposition")).createProductionLocalLinkRequestController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapLocalExecutionError);
  return router({
    mine: protectedProcedure.input(localProjectMineSchema).query(({ ctx, input }) => call(async () => (await get()).mine(ctx.principal, input.projectId))),
    unlink: protectedProcedure.input(localProjectUnlinkSchema).mutation(({ ctx, input }) => call(async () => (await get()).unlink(ctx.principal, input))),
    requestLink: protectedProcedure.input(localProjectLinkRequestSchema).mutation(({ ctx, input }) => call(async () => (await requests()).open(ctx.principal, input.projectId))),
    linkRequest: protectedProcedure.input(localProjectLinkRequestSchema).query(({ ctx, input }) => call(async () => (await requests()).latest(ctx.principal, input.projectId))),
  });
}

export const localProjectsRouter = createLocalProjectsRouter();
