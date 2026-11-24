import type { SessionControlDao, SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { SessionControlRow, SessionStatusDao } from "../../terminal/sessionStatusPorts";
import type { RequestCancellation } from "./requestCancellation";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionLog } from "./sessionLog";
import { INTERRUPTED_BY_PERSON_NOTE } from "./sessionNotes";
import type { TickStep } from "./sessionTickStep";

const END_REASON = "other";
const TURN_STATUSES = new Set(["running", "asking"]);

export type ControlsDeps = {
  registry: SessionHandleRegistry;
  hostId: string;
  status: Pick<SessionStatusDao, "controlRequests" | "transition" | "markEnded">;
  controls: Pick<SessionControlDao, "clearControl">;
  messages: Pick<SessionMessageDao, "insertSystemMessage">;
  cancellation: RequestCancellation;
  flush: () => Promise<void>;
  captureEnd: (sessionId: string) => Promise<void>;
  now: () => Date;
  log: SessionLog;
};

export class SessionControlsStep implements TickStep {
  readonly name = "controls";

  constructor(private readonly deps: ControlsDeps) {}

  async run() {
    const query = { sessionIds: this.deps.registry.ids(), hostId: this.deps.hostId };
    for (const row of await this.deps.status.controlRequests(query)) {
      if (row.endRequestedAt) await this.end(row);
      else if (row.interruptRequestedAt) await this.interrupt(row);
    }
  }

  private async interrupt(row: SessionControlRow) {
    const handle = this.deps.registry.get(row.id);
    const pending = await this.deps.cancellation.pendingIds(row.id);
    if (handle && (TURN_STATUSES.has(row.status) || pending.length > 0)) {
      await handle.interrupt();
      await this.deps.cancellation.cancelAll(row.id);
      await this.deps.messages.insertSystemMessage({ sessionId: row.id, content: INTERRUPTED_BY_PERSON_NOTE, occurredAt: this.deps.now() });
      await this.deps.status.transition(row.id, "interrupted");
      this.deps.log.info("interrupted", { sessionId: row.id });
    }
    await this.deps.controls.clearControl(row.id, "interrupt");
  }

  private async end(row: SessionControlRow) {
    await this.deps.cancellation.cancelAll(row.id);
    const handle = this.deps.registry.get(row.id);
    if (handle) await handle.close();
    else await this.deps.captureEnd(row.id);
    await this.deps.flush();
    await this.deps.status.markEnded({ sessionId: row.id, reason: END_REASON, at: this.deps.now() });
    await this.deps.controls.clearControl(row.id, "end");
    this.deps.log.info("ended", { sessionId: row.id });
  }
}
