import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { SessionFolderService } from "../application/services/worktrees/sessionFolderService";
import { WorktreeChoiceService } from "../application/services/worktrees/worktreeChoiceService";
import { WorktreeChoiceController } from "../controllers/worktreeChoiceController";
import { createWorkAuthorization } from "./assignedIssuesComposition";
import { requireDatabase, type Database } from "./database/client";
import { DrizzleTerminalSessionDao } from "./database/dao/terminal/drizzleTerminalSessionDao";
import { DrizzleWorktreeChoiceDao } from "./database/dao/worktrees/drizzleWorktreeChoiceDao";
import { ExecGitCheckoutInspector } from "./terminal/execGitCheckoutInspector";
import { GitWorktreeManager } from "./worktrees/gitWorktreeManager";

export type WorktreeOverrides = { workAuthorization?: Pick<WorkAuthorization, "requireOperate">; now?: () => Date };

export function createSessionFolderService(database: Database) {
  return new SessionFolderService({ choices: new DrizzleWorktreeChoiceDao(database), worktrees: new GitWorktreeManager(new ExecGitCheckoutInspector()) });
}

export function createWorktreeController(database: Database, overrides: WorktreeOverrides = {}) {
  const choices = new WorktreeChoiceService({ choices: new DrizzleWorktreeChoiceDao(database), plannings: new DrizzleTerminalSessionDao(database), clock: overrides.now });
  return new WorktreeChoiceController({ authorization: overrides.workAuthorization ?? createWorkAuthorization(database), choices });
}

export function createProductionWorktreeController() {
  return createWorktreeController(requireDatabase());
}
