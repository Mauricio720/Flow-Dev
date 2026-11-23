import type { ClaimInput, SessionControlDao, SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { RequestCancellation } from "./requestCancellation";
import type { SessionLog } from "./sessionLog";
import { interruptedAtNote } from "./sessionNotes";
import type { TickStep } from "./sessionTickStep";

export type OrphanDeps = {
  control: Pick<SessionControlDao, "markOrphans">;
  messages: Pick<SessionMessageDao, "insertSystemMessage">;
  cancellation: RequestCancellation;
  identity: ClaimInput;
  now: () => Date;
  log: SessionLog;
};

export class OrphanRecoveryStep implements TickStep {
  readonly name = "orphans";
  private done = false;

  constructor(private readonly deps: OrphanDeps) {}

  async run() {
    if (this.done) return;
    const orphans = await this.deps.control.markOrphans(this.deps.identity);
    for (const sessionId of orphans) await this.interrupt(sessionId);
    this.done = true;
    this.deps.log.info("orphans_marked", { host: this.deps.identity.hostId, count: orphans.length });
  }

  private async interrupt(sessionId: string) {
    await this.deps.cancellation.cancelAll(sessionId);
    await this.deps.messages.insertSystemMessage({ sessionId, content: interruptedAtNote(this.deps.now()), occurredAt: this.deps.now() });
  }
}
