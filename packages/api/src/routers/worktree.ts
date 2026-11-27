import type { WorktreeChoiceController } from "../controllers/worktreeChoiceController";
import { mapTerminalError } from "../controllers/terminalErrorMapper";
import { worktreeChooseInputSchema } from "../schemas/worktree";
import { protectedProcedure, router } from "../trpc";

export function createWorktreeRouter(controller: () => WorktreeChoiceController) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTerminalError);
  return router({
    choose: protectedProcedure.input(worktreeChooseInputSchema).mutation(({ ctx, input }) => call(() => controller().choose(ctx.principal, input))),
  });
}
