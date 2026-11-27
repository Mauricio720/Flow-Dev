import { AgentAccountController } from "../controllers/agentAccountController";
import { mapAgentAccountError } from "../controllers/agentAccountErrorMapper";
import { agentAccountCreateInputSchema, agentAccountIdInputSchema, agentAccountRenameInputSchema } from "../schemas/agentAccounts";
import { protectedProcedure, router } from "../trpc";
import { createProductionAgentAccountController } from "../infra/agentAccountComposition";

export function createAgentAccountsRouter(controller?: AgentAccountController) {
  let production: AgentAccountController | undefined;
  const getController = () => controller ?? (production ??= createProductionAgentAccountController());
  return router({
    list: protectedProcedure.query(({ ctx }) => getController().list(ctx.principal).catch(mapAgentAccountError)),
    create: protectedProcedure.input(agentAccountCreateInputSchema).mutation(({ ctx, input }) => getController().create(ctx.principal, input).catch(mapAgentAccountError)),
    rename: protectedProcedure.input(agentAccountRenameInputSchema).mutation(({ ctx, input }) => getController().rename(ctx.principal, input).catch(mapAgentAccountError)),
    verify: protectedProcedure.input(agentAccountIdInputSchema).mutation(({ ctx, input }) => getController().verify(ctx.principal, input).catch(mapAgentAccountError)),
    remove: protectedProcedure.input(agentAccountIdInputSchema).mutation(({ ctx, input }) => getController().remove(ctx.principal, input).catch(mapAgentAccountError)),
  });
}

export const agentAccountsRouter = createAgentAccountsRouter();
