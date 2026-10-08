import { homedir } from "node:os";
import { sanitizeFailureDetail } from "../../application/services/local-execution/localFailureDetail";
import { QUESTION_CHOICES_MAX, QUESTION_FALLBACK_TITLE, type QuestionReport, type QuestionState } from "../../application/services/local-execution/localQuestions";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import type { RuntimeInteraction, SpecRuntimeGateway } from "../../application/spec/specRuntimeGateway";
import type { RunLauncher } from "../spec/compozy/snapshotRunExecutor";

export type QuestionWatch = { launcher: RunLauncher; gateway: Pick<SpecRuntimeGateway, "interactions">; request: ExecutionRequest; root: string; known: Map<string, QuestionState> };

const QUESTION_KIND = "question";
const PENDING = "pending";
const RESOLVED = "resolved";

function reportOf(question: RuntimeInteraction, root: string): QuestionReport {
  const clean = (value: string | null) => sanitizeFailureDetail(value, { checkoutRoot: root, home: homedir() });
  const choices = question.choices.map(clean).filter((choice): choice is string => choice !== null).slice(0, QUESTION_CHOICES_MAX);
  return { interactionId: question.id, status: PENDING, title: clean(question.title) ?? QUESTION_FALLBACK_TITLE, choices };
}

async function pendingNow(watch: QuestionWatch) {
  const { workspaceId, sessionId } = watch.request.run.runtime;
  if (!workspaceId || !sessionId) return [];
  const { socketPath } = await watch.launcher.start(watch.request);
  const interactions = await watch.gateway.interactions({ socketPath, workspaceId, sessionId });
  return interactions.filter((item) => item.kind === QUESTION_KIND && item.status === PENDING);
}

/** Returns one report for each question that appeared or stopped waiting since the last check. */
export async function questionChanges(watch: QuestionWatch): Promise<QuestionReport[]> {
  const pending = await pendingNow(watch).catch(() => null);
  if (!pending) return [];
  const appeared = pending.filter((question) => watch.known.get(question.id) !== PENDING).map((question) => reportOf(question, watch.root));
  const stillPending = new Set(pending.map((question) => question.id));
  const answered = [...watch.known].filter(([id, state]) => state === PENDING && !stillPending.has(id)).map(([id]): QuestionReport => ({ interactionId: id, status: RESOLVED, title: QUESTION_FALLBACK_TITLE, choices: [] }));
  for (const report of [...appeared, ...answered]) watch.known.set(report.interactionId, report.status);
  return [...appeared, ...answered];
}
