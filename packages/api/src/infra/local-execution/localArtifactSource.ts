import type { LocalConnectorDao } from "../../application/database/dao/localConnectorDao";
import type { RunRecord, TaskFlowDao } from "../../application/database/dao/taskFlowDao";
import { assembleArtifacts, belongsToAction, type ArtifactPart } from "../../application/services/local-execution/localArtifacts";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import type { PackageFile } from "../../application/services/task-flow/artifactValidator";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import type { ArtifactSource } from "../../application/services/task-flow/packageCapture";

const ARTIFACT_EVENT = "artifact";

export type LocalArtifactDependencies = { local: Pick<LocalConnectorDao, "commandForActor">; flow: Pick<TaskFlowDao, "taskContext">; fallback: ArtifactSource };

export class LocalArtifactSource implements ArtifactSource {
  constructor(private readonly deps: LocalArtifactDependencies) {}

  async read(run: RunRecord): Promise<PackageFile[]> {
    const snapshot = run.snapshot as ActionSnapshot;
    if (snapshot.workspace.kind !== "local") return this.deps.fallback.read(run);
    const context = await this.deps.flow.taskContext(run.taskId);
    const commandId = run.runtime.sessionId;
    if (!context?.projectId || !snapshot.operatorId || !commandId) throw new LocalExecutionError("command_unavailable");
    const record = await this.deps.local.commandForActor({ actorId: snapshot.operatorId, projectId: context.projectId, commandId });
    if (!record) throw new LocalExecutionError("command_unavailable");
    const parts = record.events.filter((event) => event.kind === ARTIFACT_EVENT).map((event) => event.payload as ArtifactPart);
    return assembleArtifacts(parts.filter((part) => belongsToAction(part.path, snapshot.kind)));
  }
}
