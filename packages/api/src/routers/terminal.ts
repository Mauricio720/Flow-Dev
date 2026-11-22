import type { TerminalSessionController } from "../controllers/terminalSessionController";
import { mapTerminalError } from "../controllers/terminalErrorMapper";
import { terminalOpenInputSchema, terminalPreflightInputSchema } from "../schemas/terminal";
import { protectedProcedure, router } from "../trpc";

export function createTerminalRouter(controller: () => TerminalSessionController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTerminalError);
  return router({
    preflight: protectedProcedure.input(terminalPreflightInputSchema).query(({ ctx, input }) => call(() => controller().preflight(ctx.principal, input))),
    open: protectedProcedure.input(terminalOpenInputSchema).mutation(({ ctx, input }) => call(() => controller().open(ctx.principal, input))),
  });
}
