import type { LocalConnectorDao } from "../application/database/dao/localConnectorDao";
import { LocalExecutionError } from "../application/services/local-execution/localExecutionErrors";
import { localPayloadHash } from "../application/services/local-execution/localHash";
import type { LocalProjectInfo } from "../application/services/task-flow/localProjectAccess";

type Scope = { taskId: string; projectId: string; actorId: string };
type Dependencies = { local: LocalConnectorDao; resolveTarget: (scope: Scope) => Promise<LocalProjectInfo | null>; now: () => Date };

export async function queueLocalWorktreeOpen(deps: Dependencies, input: Scope & { requestKey: string }) {
  const project = await deps.resolveTarget(input);
  if (!project) throw new LocalExecutionError("link_unavailable");
  const payload = {};
  const now = deps.now();
  const command = await deps.local.enqueueCommand({
    machineId: project.target.machineId, linkId: project.target.linkId, projectId: input.projectId, actorId: input.actorId,
    runId: null, preparationId: input.requestKey, protocolVersion: 1, target: project.target,
    requestKey: input.requestKey, kind: "open_worktree", payload, payloadHash: localPayloadHash(payload),
    fence: 1, leaseExpiresAt: new Date(now.getTime() + 60_000), expectedLinkRevision: project.target.linkRevision, now,
  });
  return { commandId: command.id };
}

export async function readLocalWorktreeOpen(deps: Pick<Dependencies, "local">, input: Scope & { commandId: string }) {
  const result = await deps.local.commandForActor(input);
  if (!result || result.command.kind !== "open_worktree" || result.command.target.worktreeTaskId !== input.taskId) return null;
  const terminal = result.events.find((event) => event.kind === "terminal");
  const outcome = terminal?.payload.outcome;
  return { state: typeof outcome === "string" ? outcome : result.command.state, reason: typeof terminal?.payload.reason === "string" ? terminal.payload.reason : null };
}
