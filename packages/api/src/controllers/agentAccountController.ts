import type { SessionPrincipal } from "../context";
import type { AgentAccountService } from "../application/services/agent-accounts/agentAccountService";

export class AgentAccountController {
  constructor(private readonly service: AgentAccountService) {}
  list(actor: SessionPrincipal) { return this.service.list(actor.userId); }
  create(actor: SessionPrincipal, input: { provider: "claude" | "codex"; label: string }) { return this.service.create(actor.userId, input); }
  rename(actor: SessionPrincipal, input: { id: string; label: string; version: number }) { return this.service.rename(actor.userId, input); }
  verify(actor: SessionPrincipal, input: { id: string }) { return this.service.verify(actor.userId, input); }
  remove(actor: SessionPrincipal, input: { id: string }) { return this.service.remove(actor.userId, input); }
}
