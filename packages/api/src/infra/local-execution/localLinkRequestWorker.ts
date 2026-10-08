export type LinkRequestClaim = { requestId: string; projectId: string; repositoryOwner: string; repositoryName: string; expectedRevision: number };
export type LinkRequestSettlement = { requestId: string; outcome: "linked" | "failed"; reason: string | null };

type Dependencies = {
  claim: () => Promise<LinkRequestClaim | null>;
  pick: () => Promise<string>;
  link: (target: LinkRequestClaim & { path: string }) => Promise<unknown>;
  settle: (settlement: LinkRequestSettlement) => Promise<unknown>;
};

const REASON_PATTERN = /^[a-z_]{1,64}$/;
const UNKNOWN_FAILURE_REASON = "link_failed";

export class LocalLinkRequestWorker {
  private inFlight: Promise<void> | null = null;
  constructor(private readonly deps: Dependencies) {}

  async tick() {
    if (this.inFlight) return;
    const claim = await this.deps.claim().catch(() => null);
    if (!claim) return;
    this.inFlight = this.fulfil(claim).finally(() => { this.inFlight = null; });
  }

  whenIdle() {
    return this.inFlight ?? Promise.resolve();
  }

  private async fulfil(claim: LinkRequestClaim) {
    const result = await this.linkChosenFolder(claim);
    await this.deps.settle({ requestId: claim.requestId, ...result }).catch(() => undefined);
  }

  private async linkChosenFolder(claim: LinkRequestClaim) {
    try {
      const path = await this.deps.pick();
      await this.deps.link({ ...claim, path });
      return { outcome: "linked" as const, reason: null };
    } catch (error) {
      return { outcome: "failed" as const, reason: safeReason(error) };
    }
  }
}

function safeReason(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return REASON_PATTERN.test(message) ? message : UNKNOWN_FAILURE_REASON;
}
