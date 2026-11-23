import { mapTaskError } from "../controllers/taskErrorMapper";
import type { TaskArtifactController } from "../controllers/taskArtifactController";
import { artifactGetInputSchema, artifactListInputSchema } from "../schemas/artifacts";
import { protectedProcedure, router } from "../trpc";

export function createArtifactsRouter(controller: () => TaskArtifactController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTaskError);
  return router({
    list: protectedProcedure.input(artifactListInputSchema).query(({ ctx, input }) => call(() => controller().list(ctx.principal, input))),
    get: protectedProcedure.input(artifactGetInputSchema).query(({ ctx, input }) => call(() => controller().get(ctx.principal, input))),
  });
}
