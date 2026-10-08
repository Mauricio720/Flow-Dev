import type { SoftwareController } from "../controllers/softwareController";
import { mapSoftwareError } from "../controllers/softwareErrorMapper";
import { beginLoginSchema, confirmAccountSchema, connectionsSchema, disconnectSchema, pageSchema, pollLoginSchema, renameSchema, saveSettingsSchema } from "../schemas/software";
import { protectedProcedure, router } from "../trpc";

export function createSoftwareRouter(controller?: SoftwareController) {
  let production: SoftwareController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/softwareComposition")).createProductionSoftwareController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapSoftwareError);
  return router({
    compozy: router({
      get: protectedProcedure.query(({ ctx }) => call(async () => (await get()).get(ctx.principal))),
      readiness: protectedProcedure.query(({ ctx }) => call(async () => (await get()).readiness(ctx.principal))),
      connections: protectedProcedure.input(connectionsSchema).query(({ ctx, input }) => call(async () => (await get()).connections(ctx.principal, input))),
      history: protectedProcedure.input(pageSchema).query(({ ctx, input }) => call(async () => (await get()).history(ctx.principal, input))),
      saveSettings: protectedProcedure.input(saveSettingsSchema).mutation(({ ctx, input }) => call(async () => (await get()).saveSettings(ctx.principal, input))),
      beginCodexLogin: protectedProcedure.input(beginLoginSchema).mutation(({ ctx, input }) => call(async () => (await get()).beginCodexLogin(ctx.principal, input))),
      beginClaudeLogin: protectedProcedure.input(beginLoginSchema).mutation(({ ctx, input }) => call(async () => (await get()).beginClaudeLogin(ctx.principal, input))),
      pollLogin: protectedProcedure.input(pollLoginSchema).mutation(({ ctx, input }) => call(async () => (await get()).pollLogin(ctx.principal, input))),
      confirmAccount: protectedProcedure.input(confirmAccountSchema).mutation(({ ctx, input }) => call(async () => (await get()).confirmAccount(ctx.principal, input))),
      disconnect: protectedProcedure.input(disconnectSchema).mutation(({ ctx, input }) => call(async () => (await get()).disconnect(ctx.principal, input))),
      renameConnection: protectedProcedure.input(renameSchema).mutation(({ ctx, input }) => call(async () => (await get()).renameConnection(ctx.principal, input))),
    }),
  });
}

export const softwareRouter = createSoftwareRouter();
