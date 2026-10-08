import type { RunRecord, TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { SpecRuntimeGateway } from "../../spec/specRuntimeGateway";
import type { LocalRunInteractions } from "./localRunInteractions";
import { TaskFlowError } from "./taskFlowErrors";

const ACTIVE_STATES = new Set(["running", "waiting", "reconciling"]);
const LOCAL_WORKSPACE = "local";
const ANSWERED = "answered";

export type AnswerRunQuestion = { runId: string; interactionId: string; choiceIndex?: number; text?: string };
export type RunSocketPath = (runId: string) => string;

export class TaskFlowInteractionService {
  constructor(private readonly flow: TaskFlowDao, private readonly gateway: SpecRuntimeGateway, private readonly socketPathFor: RunSocketPath, private readonly local?: LocalRunInteractions) {}

  async questions(taskId: string, runId: string) {
    const run = await this.activeRun(taskId, runId);
    if (isLocal(run)) return this.localInteractions().questions(run);
    const interactions = await this.gateway.interactions(this.identity(run));
    return interactions.filter((item) => item.kind === "question" && item.status === "pending")
      .map(({ id, title, choices }) => ({ id, title: title ?? "O agente precisa de uma resposta", choices }));
  }

  async answer(taskId: string, input: AnswerRunQuestion) {
    const run = await this.activeRun(taskId, input.runId);
    if (isLocal(run)) return this.answerLocal(run, input);
    const identity = this.identity(run);
    const questions = await this.gateway.interactions(identity);
    const question = questions.find((item) => item.id === input.interactionId && item.kind === "question" && item.status === "pending");
    if (!question) throw new TaskFlowError("interaction_unavailable");
    if (input.choiceIndex !== undefined && (input.choiceIndex < 0 || input.choiceIndex >= question.choices.length)) throw new TaskFlowError("invalid_input");
    const response = await this.gateway.resolve({ ...identity, kind: "question", requestId: question.providerRequestId, ...(input.choiceIndex !== undefined ? { choiceIndex: input.choiceIndex } : { text: input.text }) });
    if (response.outcome === "queue_full" || response.outcome === "unknown") throw new TaskFlowError("outcome_unknown");
    if (!response.delivered && response.outcome !== "already_resolved") throw new TaskFlowError("interaction_unavailable");
    return { outcome: response.outcome };
  }

  private async answerLocal(run: RunRecord, input: AnswerRunQuestion) {
    await this.localInteractions().answer(run, { interactionId: input.interactionId, choiceIndex: input.choiceIndex, text: input.text });
    return { outcome: ANSWERED };
  }

  private localInteractions() {
    if (!this.local) throw new TaskFlowError("service_unavailable");
    return this.local;
  }

  private async activeRun(taskId: string, runId: string) {
    const run = await this.flow.runs.find(runId);
    if (!run || run.taskId !== taskId || !ACTIVE_STATES.has(run.state) || run.snapshot.kind === "loop") throw new TaskFlowError("run_unavailable");
    if (!run.runtime.workspaceId || !run.runtime.sessionId) throw new TaskFlowError("run_unavailable");
    return run;
  }

  private identity(run: RunRecord) {
    return { socketPath: this.socketPathFor(run.id), workspaceId: run.runtime.workspaceId!, sessionId: run.runtime.sessionId! };
  }
}

function isLocal(run: RunRecord) {
  return (run.snapshot.workspace as { kind?: string } | undefined)?.kind === LOCAL_WORKSPACE;
}
