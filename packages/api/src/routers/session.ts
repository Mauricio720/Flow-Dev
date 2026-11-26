import type { SessionControllers } from "../infra/sessionInteractionComposition";
import { mapTerminalError } from "../controllers/terminalErrorMapper";
import { sessionAnswerQuestionInputSchema, sessionControlInputSchema, sessionDecidePermissionInputSchema, sessionDecideRouteSwitchInputSchema, sessionSendInputSchema, sessionTimelineInputSchema } from "../schemas/session";
import { protectedProcedure, router } from "../trpc";

export function createSessionRouter(controllers: () => SessionControllers) {
  const call = <T>(operation: () => Promise<T>) => operation().catch(mapTerminalError);
  return router({
    timeline: protectedProcedure.input(sessionTimelineInputSchema).query(({ ctx, input }) => call(() => controllers().timeline.timeline(ctx.principal, input))),
    send: protectedProcedure.input(sessionSendInputSchema).mutation(({ ctx, input }) => call(() => controllers().interaction.send(ctx.principal, input))),
    answerQuestion: protectedProcedure.input(sessionAnswerQuestionInputSchema).mutation(({ ctx, input }) => call(() => controllers().requests.answerQuestion(ctx.principal, input))),
    decidePermission: protectedProcedure.input(sessionDecidePermissionInputSchema).mutation(({ ctx, input }) => call(() => controllers().requests.decidePermission(ctx.principal, input))),
    decideRouteSwitch: protectedProcedure.input(sessionDecideRouteSwitchInputSchema).mutation(({ ctx, input }) => call(() => controllers().routeSwitches.decide(ctx.principal, input))),
    interrupt: protectedProcedure.input(sessionControlInputSchema).mutation(({ ctx, input }) => call(() => controllers().interaction.interrupt(ctx.principal, input))),
    end: protectedProcedure.input(sessionControlInputSchema).mutation(({ ctx, input }) => call(() => controllers().interaction.end(ctx.principal, input))),
  });
}
