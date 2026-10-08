import type { LocalConnectorDao } from "../../application/database/dao/localConnectorDao";
import type { RunRecord, TaskFlowDao } from "../../application/database/dao/taskFlowDao";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import { pendingQuestions, type RunQuestion } from "../../application/services/local-execution/localQuestions";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import type { LocalAnswer, LocalRunInteractions } from "../../application/services/task-flow/localRunInteractions";
import { TaskFlowError } from "../../application/services/task-flow/taskFlowErrors";
import { deterministicLocalRequestKey } from "./requestKey";

const ANSWER_LEASE_MS = 60_000;
const ANSWER_OPERATIONS = ["answer", "answer-retry"];
const TERMINAL_EVENT = "terminal";

type Dependencies = { local: Pick<LocalConnectorDao, "commandForActor" | "enqueueCommand">; flow: Pick<TaskFlowDao, "taskContext">; now?: () => Date };
type Scope = { actorId: string; projectId: string };

export class LocalRunQuestions implements LocalRunInteractions {
  constructor(private readonly deps: Dependencies) {}

  async questions(run: RunRecord): Promise<RunQuestion[]> {
    const scope = await this.scopeOf(run);
    const reported = await this.reported(run, scope);
    const visible = await Promise.all(reported.map(async (question) => ((await this.answerOperation(run, scope, question.id)) ? question : null)));
    return visible.filter((question): question is RunQuestion => question !== null);
  }

  async answer(run: RunRecord, input: LocalAnswer) {
    const scope = await this.scopeOf(run);
    const question = (await this.reported(run, scope)).find((candidate) => candidate.id === input.interactionId);
    const operation = question ? await this.answerOperation(run, scope, question.id) : null;
    if (!question || !operation) throw new TaskFlowError("interaction_unavailable");
    const answer = input.choiceIndex === undefined ? input.text : question.choices[input.choiceIndex];
    if (!answer) throw new TaskFlowError("invalid_input");
    await this.enqueue(run, scope, { id: deterministicLocalRequestKey(`${run.id}:${question.id}`, operation), payload: { interactionId: question.id, answer } });
  }

  private async reported(run: RunRecord, scope: Scope) {
    const record = await this.deps.local.commandForActor({ ...scope, commandId: run.runtime.sessionId! });
    return record ? pendingQuestions(record.events) : [];
  }

  private async answerOperation(run: RunRecord, scope: Scope, interactionId: string) {
    for (const operation of ANSWER_OPERATIONS) {
      const sent = await this.deps.local.commandForActor({ ...scope, commandId: deterministicLocalRequestKey(`${run.id}:${interactionId}`, operation) });
      if (!sent) return operation;
      if (!sent.events.some((event) => event.kind === TERMINAL_EVENT)) return null;
    }
    return null;
  }

  private async enqueue(run: RunRecord, scope: Scope, command: { id: string; payload: { interactionId: string; answer: string } }) {
    const { workspace } = run.snapshot as ActionSnapshot;
    const target = workspace.kind === "local" ? workspace.target : undefined;
    if (!target) throw new TaskFlowError("interaction_unavailable");
    const now = (this.deps.now ?? (() => new Date()))();
    try {
      await this.deps.local.enqueueCommand({ id: command.id, requestKey: command.id, machineId: target.machineId, linkId: target.linkId, ...scope, runId: run.id, preparationId: null, protocolVersion: 1, target, kind: "answer", payload: command.payload, payloadHash: localPayloadHash(command.payload), fence: Math.max(1, run.leaseFence), leaseExpiresAt: new Date(now.getTime() + ANSWER_LEASE_MS), expectedLinkRevision: target.linkRevision, now });
    } catch (error) {
      if (error instanceof LocalExecutionError) throw new TaskFlowError("interaction_unavailable");
      throw error;
    }
  }

  private async scopeOf(run: RunRecord): Promise<Scope> {
    const context = await this.deps.flow.taskContext(run.taskId);
    const actorId = (run.snapshot as ActionSnapshot).operatorId;
    if (!context?.projectId || !actorId) throw new TaskFlowError("run_unavailable");
    return { actorId, projectId: context.projectId };
  }
}
