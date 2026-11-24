import type { SessionPrincipal } from "../../../context";
import type { RepositoryAccessService } from "./repositoryAccessService";

const READ_CHECK_TTL_MS = 10_000;

export class ReadAccessGate {
  private readonly checks = new Map<string, number>();

  constructor(private readonly repositories: Pick<RepositoryAccessService, "requireRead">, private readonly now: () => number = Date.now) {}

  async require(actor: SessionPrincipal, projectId: string) {
    const key = `${actor.userId}:${projectId}`;
    const current = this.now();
    if ((this.checks.get(key) ?? 0) > current) return;
    await this.repositories.requireRead(actor, projectId);
    this.dropExpired(current);
    this.checks.set(key, current + READ_CHECK_TTL_MS);
  }

  private dropExpired(current: number) {
    for (const [key, expiresAt] of this.checks) {
      if (expiresAt <= current) this.checks.delete(key);
    }
  }
}
