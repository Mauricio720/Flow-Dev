import { mapTaskSummary, type TaskDao } from "../../application/database/dao/taskDao";
import { storedDraftLabels } from "../../application/services/tasks/draftRules";
import { splitFailureCode } from "../../application/services/tasks/failureCode";
import { planningDto } from "./planningDtoMapper";
import { publicationDto, revisionDto, summaryDto } from "./taskDtoMapper";

type Resolved<Method extends keyof TaskDao> = Awaited<ReturnType<TaskDao[Method]>>;

export type TaskWorkspaceParts = {
  task: NonNullable<Resolved<"findScoped">>;
  revision: Resolved<"currentRevision">;
  pendingProposal: Resolved<"pendingProposal">;
  publication: Resolved<"publication">;
  activity: Resolved<"activity">;
  authorNames: Map<string, string>;
  planning: Resolved<"planning">;
  lastOpened: Resolved<"terminalLastOpened">;
  execution: Resolved<"terminalExecution">;
  canAuthor: boolean;
};

export function workspaceDto(parts: TaskWorkspaceParts) {
  const { task, revision, canAuthor } = parts;
  const summary = mapTaskSummary(task, revision ? storedDraftLabels(revision.canonicalDraft) : []);
  return { task: summaryDto(summary, parts.authorNames), currentRevision: revision ? revisionDto(revision) : null, pendingProposal: parts.pendingProposal, publication: publicationDto(parts.publication), activity: parts.activity, planning: planningDto(parts.planning, { canOperate: false }), terminal: { lastOpened: parts.lastOpened }, execution: parts.execution, permissions: { canEdit: canAuthor }, viewerCanAuthor: canAuthor, lastError: task.lastError ? splitFailureCode(task.lastError) : null };
}
