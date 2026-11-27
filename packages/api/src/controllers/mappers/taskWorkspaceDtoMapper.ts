import { mapTaskSummary, type TaskDao } from "../../application/database/dao/taskDao";
import { storedDraftLabels } from "../../application/services/tasks/draftRules";
import { splitFailureCode } from "../../application/services/tasks/failureCode";
import { planningDto } from "./planningDtoMapper";
import { publicationDto, revisionDto, summaryDto } from "./taskDtoMapper";
import { readyAssignmentView } from "../../application/services/tasks/readyAssignmentView";
import { worktreeChoiceView } from "../../application/services/worktrees/worktreeChoiceView";

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
  worktree: Resolved<"worktreeChoice">;
  canAuthor: boolean;
  now: Date;
};

function issueNumberOf(parts: TaskWorkspaceParts) {
  return parts.planning.source?.issueNumber ?? parts.publication?.issueNumber ?? null;
}

export function workspaceDto(parts: TaskWorkspaceParts) {
  const { task, revision, canAuthor } = parts;
  const summary = mapTaskSummary(task, revision ? storedDraftLabels(revision.canonicalDraft) : []);
  return { task: summaryDto(summary, parts.authorNames), currentRevision: revision ? revisionDto(revision) : null, pendingProposal: parts.pendingProposal, publication: publicationDto(parts.publication, parts.publication ? readyAssignmentView(parts.publication, parts.now) : null), activity: parts.activity, planning: planningDto(parts.planning, { canOperate: false }), terminal: { lastOpened: parts.lastOpened }, execution: parts.execution, worktree: worktreeChoiceView(parts.worktree, issueNumberOf(parts)), permissions: { canEdit: canAuthor }, viewerCanAuthor: canAuthor, lastError: task.lastError ? splitFailureCode(task.lastError) : null };
}
