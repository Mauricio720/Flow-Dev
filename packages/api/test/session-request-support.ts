import { QUESTIONS_PAYLOAD, type openedFlowDevSession } from "./session-interaction-support";

export type SessionWorld = Awaited<ReturnType<typeof openedFlowDevSession>>;
export type AnswerSet = Record<string, { labels: string[]; other?: string }>;

export const [VISIBILITY, CHECKS] = QUESTIONS_PAYLOAD.questions.map((question) => question.question) as [string, string];
export const COMPLETE: AnswerSet = { [VISIBILITY]: { labels: ["Só membros (Recomendado)"] }, [CHECKS]: { labels: ["lint", "test"] } };
export const FREE_TEXT_LIMIT = 2_000;

export const answerQuestion = (world: SessionWorld, requestId: string, answers: AnswerSet = COMPLETE) => world.harness.caller.session.answerQuestion({ projectId: world.scope.projectId, taskId: world.scope.taskId, requestId, answers });
export const decide = (input: { world: SessionWorld; requestId: string; decision: "allow" | "allow_session" | "allow_always" | "deny"; reason?: string }) => input.world.harness.caller.session.decidePermission({ projectId: input.world.scope.projectId, taskId: input.world.scope.taskId, requestId: input.requestId, decision: input.decision, reason: input.reason });
