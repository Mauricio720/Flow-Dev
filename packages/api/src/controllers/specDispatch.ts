import { assertUpstreamPackages } from "../application/services/spec/specInput";
import { buildSpecPrompt } from "../application/services/spec/specPrompt";
import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import type { RuntimeIdentity } from "../application/spec/specRuntimeGateway";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import { checkEntitlement } from "./specEntitlement";
import { attemptFailureReason } from "./specErrorMapper";
import { runtimeIdentity } from "./specStopSupervisor";
import type { SpecWorkerDeps } from "./specWorkerTypes";

export async function dispatchAttempt(deps: SpecWorkerDeps, claim: SpecClaim) {
  try {
    const entitlement = await checkEntitlement(deps, claim);
    if (entitlement === "suspended") return await deps.dao.release(claim);
    if (entitlement !== "granted") return;
    const prompt = await prepareExecution(deps, claim);
    if (!prompt) return;
    await submitOnce(deps, claim, prompt);
  } catch (error) {
    await settleFailure(deps, claim, error);
  }
}

async function prepareExecution(deps: SpecWorkerDeps, claim: SpecClaim) {
  assertUpstreamPackages(claim.input);
  const inputFiles = (await deps.upstream(claim)).map((entry) => entry.path);
  const prompt = buildSpecPrompt({ claim, answers: [], inputFiles });
  const repository = await deps.access.repository(claim);
  const workspace = await deps.workspaces.prepare({ taskId: claim.taskId, repositoryGithubId: claim.input.repositoryGithubId, owner: repository.owner, name: repository.name, pinnedCommit: claim.input.commitSha, credential: await deps.access.credential(claim) });
  await deps.dao.bindWorkspace(claim, { repositoryGithubId: claim.input.repositoryGithubId, repositoryNodeId: repository.nodeId, baseCommit: workspace.baseCommit, runnerId: deps.settings.runnerId, checkoutLocator: workspace.checkoutPath, slug: workspace.slug });
  await bindRuntime(deps, claim, workspace.checkoutPath);
  return prompt;
}

async function bindRuntime(deps: SpecWorkerDeps, claim: SpecClaim, checkoutPath: string) {
  if (claim.runtimeWorkspaceId && claim.runtimeSessionId) return;
  const upstream = await deps.upstream(claim);
  await deps.workspaces.verify({ taskId: claim.taskId, repositoryGithubId: claim.input.repositoryGithubId, expected: upstream });
  const attempt = { taskId: claim.taskId, repositoryGithubId: claim.input.repositoryGithubId, attemptId: claim.attemptId, stage: claim.stage };
  const candidate = await deps.workspaces.candidate({ ...attempt, upstream, previous: await deps.dao.reviewedEntries(claim) });
  await deps.snapshot(claim, checkoutPath, candidate.snapshotPath);
  const { socketPath } = await deps.launcher.start({ attemptId: claim.attemptId, workspace: candidate, snapshotPath: candidate.snapshotPath });
  await deps.runtime.preflight({ ...deps.settings.runtime, socketPath });
  if (claim.runtimeSessionId) return;
  const created = await deps.runtime.create({ socketPath, workspaceRoot: "/workspace", workspaceName: `flow-${claim.taskId}`, agentName: deps.settings.agentName, sessionName: `attempt-${claim.attemptId}` });
  await deps.dao.bindSession(claim, { runtimeWorkspaceId: created.workspaceId, runtimeSessionId: created.sessionId });
  claim.runtimeWorkspaceId = created.workspaceId;
  claim.runtimeSessionId = created.sessionId;
}

async function submitOnce(deps: SpecWorkerDeps, claim: SpecClaim, message: string) {
  const identity = runtimeIdentity(deps, claim) as RuntimeIdentity;
  const submission = await deps.runtime.submit({ ...identity, messageId: claim.promptMessageId, idempotencyKey: claim.promptIdempotencyKey, message, provider: deps.settings.provider, model: deps.settings.model });
  if (submission.status === "accepted") return deps.dao.markPromptAccepted(claim, submission.turnId);
  if (submission.status === "queue_full") return deps.dao.release(claim);
  await deps.dao.settle(claim, { state: "reconciling", reason: "outcome_unknown" });
}

async function settleFailure(deps: SpecWorkerDeps, claim: SpecClaim, error: unknown) {
  if (error instanceof SpecRuntimeError && error.uncertain) return deps.dao.settle(claim, { state: "reconciling", reason: error.reason });
  const reason = attemptFailureReason(error);
  console.error(JSON.stringify({ event: "spec.dispatch_failed", attemptId: claim.attemptId, fence: claim.fence, reason }));
  await deps.launcher.stop(claim.attemptId).catch(() => undefined);
  await deps.dao.settle(claim, { state: "failed", reason });
}
