import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { CompozyTaskSpec } from "../src/application/compozy/compozyGateway";
import { parseExecutionRuntime } from "../src/application/compozy/compozyExecutionRuntime";
import { CompozyHttpGateway } from "../src/infra/compozy/compozyHttpGateway";
import { removeSmokeSessions, removeSmokeTask, removeSmokeWorkspace, removeSmokeWorktrees } from "./compozy-smoke-cleanup";
import { readSmokeReviewSessions } from "./compozy-smoke-review";
import { disposableRepository, poll, record, smokeEnabled } from "./compozy-smoke-support";

const STEP_TIMEOUT_MS = 12 * 60_000;
const PROBE_TIMEOUT_MS = 30 * 60_000;
const TERMINAL_RUN_STATES = ["completed", "failed", "canceled", "needs_attention"];
const DEFAULT_REVIEW_AGENT = "reviewer";
const REVIEW_AGENT_ENV = "COMPOZY_EXECUTION_REVIEW_AGENT";
const VALID_REVIEW_OUTCOMES = ["approved", "rejected"];
const reviewAgentName = process.env[REVIEW_AGENT_ENV] ?? DEFAULT_REVIEW_AGENT;
const gateway = new CompozyHttpGateway();
const suffix = randomUUID().slice(0, 8);
const state: { repository?: Awaited<ReturnType<typeof disposableRepository>>; workspaceId?: string; taskId?: string } = {};

const description = [
  "Sonda descartável do Flow Dev (IT-021).",
  "Trabalhe somente na worktree da sessão dedicada a este run. Se `compozy__task_run_claim_next` devolver outra sessão, encerre o turno sem alterar arquivos.",
  "Crie o arquivo HELLO.md com a linha `ok` e faça commit no branch atual. Não faça push nem abra pull request.",
  "Conclua o run com `compozy__task_run_complete`, passando como `result` um texto cuja última linha é `PR: none`.",
].join("\n\n");

const smokeTask = (): CompozyTaskSpec => ({
  identifier: `FD-SMOKE-${suffix}-impl`, title: `Implementar: sonda IT-021 ${suffix}`, description,
  metadata: { "flow_dev.smoke": "IT-021" }, maxAttempts: 2, requiresApproval: false, autoEnqueueOnReady: false,
  profile: { worker: { agentName: "code_implementer" }, review: { agentName: reviewAgentName }, worktree: { mode: "per_run" }, runtime: parseExecutionRuntime(process.env) },
});

afterAll(async () => {
  if (state.taskId) record("cleanup.task", await removeSmokeTask(state.taskId));
  if (state.workspaceId) record("cleanup.sessions", await removeSmokeSessions(state.workspaceId));
  if (state.workspaceId) record("cleanup.worktrees", await removeSmokeWorktrees(state.workspaceId));
  if (state.workspaceId) record("cleanup.workspace", await removeSmokeWorkspace(state.workspaceId));
  await state.repository?.remove();
}, PROBE_TIMEOUT_MS);

describe.runIf(smokeEnabled)("IT-021 native execution through the task profile runtime", () => {
  it("runs the worker chosen by the profile and closes the run from the worker session", async () => {
    state.repository = await disposableRepository();
    state.workspaceId = (await gateway.resolveWorkspace(state.repository.root)).workspaceId;
    state.taskId = (await gateway.createTask(state.workspaceId, smokeTask())).taskId;
    await gateway.enqueueRun({ taskId: state.taskId, idempotencyKey: randomUUID() });
    const finished = await poll(() => gateway.readTask(state.taskId!), (task) => TERMINAL_RUN_STATES.includes(task.latestRun?.status ?? ""), STEP_TIMEOUT_MS);
    const result = finished.latestRun ? await gateway.readRunResult(finished.latestRun.runId).catch((error: unknown) => String(error)) : null;
    record("worker", { finished, result });
    expect(finished.latestRun?.status).toBe("completed");
  }, PROBE_TIMEOUT_MS);

  it("opens the profile reviewer when Flow Dev requests the review and records its verdict", async () => {
    const run = (await gateway.readTask(state.taskId!)).latestRun!;
    await gateway.requestReview({ taskId: state.taskId!, runId: run.runId });
    const reviewed = await poll(() => gateway.readTask(state.taskId!), (task) => Boolean(task.latestReview?.outcome), STEP_TIMEOUT_MS);
    const sessions = await readSmokeReviewSessions(state.workspaceId!, run.runId).catch((error: unknown) => ({ error: String(error) }));
    record("review", { reviewed, sessions });
    expect(VALID_REVIEW_OUTCOMES).toContain(reviewed.latestReview?.outcome);
  }, PROBE_TIMEOUT_MS);
});
