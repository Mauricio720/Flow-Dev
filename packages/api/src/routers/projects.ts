import { ProjectsController, mapProjectError } from "../controllers/projectsController";
import { projectIdSchema, projectListInputSchema } from "../schemas/projects";
import { protectedProcedure, router } from "../trpc";
import { InMemoryProjectDao } from "../infra/database/dao/projects/inMemoryProjectDao";
import { sharedAccessDao } from "../infra/database/dao/accessInMemoryDao";

const projectsController = new ProjectsController(new InMemoryProjectDao(), sharedAccessDao);

export function createProjectsRouter(controller: ProjectsController = projectsController) {
  return router({
    list: protectedProcedure.input(projectListInputSchema).query(({ ctx, input }) => controller.list(ctx.principal, input)),
    byId: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => { try { return await controller.byId(ctx.principal, input.projectId); } catch (error) { return mapProjectError(error); } }),
    select: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => { try { return await controller.select(ctx.principal, input.projectId); } catch (error) { return mapProjectError(error); } }),
  });
}

export const projectsRouter = createProjectsRouter();
