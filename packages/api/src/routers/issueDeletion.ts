import { protectedProcedure, router } from "../trpc";
import type { IssueDeletionController } from "../controllers/issueDeletionController";
import { issueDeletionPreviewSchema, issueDeletionRetrySchema, issueDeletionStartSchema, issueDeletionStatusSchema } from "../schemas/issueDeletion";
import { mapIssueDeletionError } from "../controllers/issueDeletionErrorMapper";

export function createIssueDeletionRouter(controller?: IssueDeletionController) {
  let production: IssueDeletionController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/issueDeletionComposition")).createProductionIssueDeletionController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapIssueDeletionError);
  return router({
    preview: protectedProcedure.input(issueDeletionPreviewSchema).query(async ({ ctx, input }) => call(async () => (await get()).preview(ctx.principal, input))),
    start: protectedProcedure.input(issueDeletionStartSchema).mutation(async ({ ctx, input }) => call(async () => (await get()).start(ctx.principal, input))),
    status: protectedProcedure.input(issueDeletionStatusSchema).query(async ({ ctx, input }) => call(async () => (await get()).status(ctx.principal, input.operationId))),
    retry: protectedProcedure.input(issueDeletionRetrySchema).mutation(async ({ ctx, input }) => call(async () => (await get()).retry(ctx.principal, input))),
  });
}

export const issueDeletionRouter = createIssueDeletionRouter();
