import type { TaskDao } from "../application/database/dao/taskDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { workspaceDto } from "./mappers/taskWorkspaceDtoMapper";

type WorkspaceRead = { dao: TaskDao; viewer: { userId: string; isAdmin: boolean }; scope: { projectId: string; taskId: string }; now: Date };

export async function readWorkspace(input: WorkspaceRead) {
  const { dao, viewer, scope, now } = input;
  const task = await dao.findScoped(scope.projectId, scope.taskId);
  if (!task) throw new TaskError("task_unavailable");
  const [revision, pendingProposal, publication, activity, authorNames, planning, lastOpened, execution] = await Promise.all([dao.currentRevision(task.id), dao.pendingProposal(task.id), dao.publication(task.id), dao.activity(task.id), dao.authorNames([task.authorUserId]), dao.planning(task.id), dao.terminalLastOpened(task.id), dao.terminalExecution(task.id, now)]);
  const canAuthor = viewer.isAdmin && task.authorUserId === viewer.userId;
  return workspaceDto({ task, revision, pendingProposal, publication, activity, authorNames, planning, lastOpened, execution, canAuthor });
}
