import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { WorktreeChoiceService } from "../application/services/worktrees/worktreeChoiceService";
import type { WorktreeMode } from "../application/worktrees/worktreeChoice";
import type { SessionPrincipal } from "../context";

export type WorktreeChooseInput = { projectId: string; taskId: string; mode: WorktreeMode };
export type WorktreeControllerDeps = { authorization: Pick<WorkAuthorization, "requireOperate">; choices: Pick<WorktreeChoiceService, "choose"> };

export class WorktreeChoiceController {
  constructor(private readonly deps: WorktreeControllerDeps) {}

  async choose(actor: SessionPrincipal, input: WorktreeChooseInput) {
    await this.deps.authorization.requireOperate({ projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
    return this.deps.choices.choose({ taskId: input.taskId, actorId: actor.userId, mode: input.mode });
  }
}
