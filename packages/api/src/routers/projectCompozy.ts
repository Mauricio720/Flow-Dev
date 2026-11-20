import { protectedProcedure, router } from "../trpc";
import type { ProjectCompozyController } from "../controllers/projectCompozyController";
import { mapTaskError } from "../controllers/taskErrorMapper";
import { projectCompozyCheckSchema, projectCompozyGetSchema, projectCompozySaveSchema } from "../schemas/projectCompozy";

export function createProjectCompozyRouter(controller?: ProjectCompozyController) {
  let production: ProjectCompozyController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/compozyComposition")).createProductionProjectCompozyController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    get: protectedProcedure.input(projectCompozyGetSchema).query(async ({ ctx, input }) => call(async () => (await get()).get(ctx.principal, input.projectId))),
    save: protectedProcedure.input(projectCompozySaveSchema).mutation(async ({ ctx, input }) => call(async () => (await get()).save(ctx.principal, input))),
    check: protectedProcedure.input(projectCompozyCheckSchema).mutation(async ({ ctx, input }) => call(async () => (await get()).check(ctx.principal, input))),
  });
}

export const projectCompozyRouter = createProjectCompozyRouter();
