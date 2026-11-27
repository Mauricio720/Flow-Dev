import { WorkAccountController } from "../controllers/workAccountController";
import { mapAgentAccountError } from "../controllers/agentAccountErrorMapper";
import { workAccountGetInputSchema, workAccountSetInputSchema } from "../schemas/workAccounts";
import { protectedProcedure, router } from "../trpc";
import { createProductionWorkAccountController } from "../infra/agentAccountComposition";

export function createWorkAccountsRouter(controller?: WorkAccountController | (() => WorkAccountController)) {
  let production: WorkAccountController | undefined;
  const getController = () => typeof controller === "function" ? controller() : controller ?? (production ??= createProductionWorkAccountController());
  return router({
    get: protectedProcedure.input(workAccountGetInputSchema).query(({ ctx, input }) => getController().get(ctx.principal, input).catch(mapAgentAccountError)),
    set: protectedProcedure.input(workAccountSetInputSchema).mutation(({ ctx, input }) => getController().set(ctx.principal, input).catch(mapAgentAccountError)),
  });
}
