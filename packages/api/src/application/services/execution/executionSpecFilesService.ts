import type { TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import type { CompozyGateway } from "../../compozy/compozyGateway";
import { TaskError } from "../tasks/taskErrors";
import { readSpecFiles } from "./executionSpecFiles";

const SPEC_FILES_UNAVAILABLE = "compozy_rejected";
type FilesDeps = { dao: TaskExecutionDao; gateway: Pick<CompozyGateway, "listFileEntries" | "readFile"> };
type FilesInput = { taskId: string; executionId: string };

export class ExecutionSpecFilesService {
  constructor(private readonly deps: FilesDeps) {}

  async list(input: FilesInput) {
    const execution = await this.deps.dao.findById(input.taskId, input.executionId);
    if (!execution) throw new TaskError("execution_not_found");
    if (!execution.specWorktreeId || !execution.specDir) throw new TaskError(SPEC_FILES_UNAVAILABLE);
    const files = await readSpecFiles(this.deps.gateway, { workspaceId: execution.compozyWorkspaceId, worktreeId: execution.specWorktreeId, specDir: execution.specDir });
    return { round: execution.specRound, specDir: execution.specDir, files };
  }
}
