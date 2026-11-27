import type { SessionPrincipal } from "../context";
import type { WorkAccountService } from "../application/services/agent-accounts/workAccountService";

export class WorkAccountController {
  constructor(private readonly service: WorkAccountService) {}
  get(actor: SessionPrincipal, input: { taskId: string }) { return this.service.get(actor.userId, input.taskId); }
  set(actor: SessionPrincipal, input: { taskId: string; provider: "claude" | "codex"; accountId: string | null; version: number }) { return this.service.set(actor.userId, input); }
}
