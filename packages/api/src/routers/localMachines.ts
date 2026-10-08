import type { LocalMachineController } from "../controllers/localMachineController";
import { mapLocalExecutionError } from "../controllers/localExecutionErrorMapper";
import { localMachineConfirmPairingSchema, localMachineListSchema, localMachinePairingPreviewSchema, localMachineRevokeSchema } from "../schemas/localMachines";
import { protectedProcedure, router } from "../trpc";

export function createLocalMachinesRouter(controller?: LocalMachineController) {
  let production: LocalMachineController | undefined;
  const get = async () => controller ?? (production ??= (await import("../infra/localMachineComposition")).createProductionLocalMachineController());
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapLocalExecutionError);
  return router({
    pairingPreview: protectedProcedure.input(localMachinePairingPreviewSchema).query(({ input }) => call(async () => (await get()).previewPairing(input.code))),
    confirmPairing: protectedProcedure.input(localMachineConfirmPairingSchema).mutation(({ ctx, input }) => call(async () => (await get()).confirmPairing(ctx.principal, input))),
    list: protectedProcedure.input(localMachineListSchema).query(({ ctx, input }) => call(async () => (await get()).list(ctx.principal, input))),
    revoke: protectedProcedure.input(localMachineRevokeSchema).mutation(({ ctx, input }) => call(async () => (await get()).revoke(ctx.principal, input))),
  });
}

export const localMachinesRouter = createLocalMachinesRouter();
