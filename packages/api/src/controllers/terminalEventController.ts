import type { TerminalEventDao } from "../application/database/dao/terminalEventDao";
import { summarizeHookEvent } from "../application/services/terminal/hookEventSummarizer";
import type { ArtifactCaptureService } from "../application/services/terminal/artifactCaptureService";
import { hashSessionToken } from "../application/services/terminal/sessionToken";
import { planIngestion } from "../application/services/terminal/terminalEventIngestion";
import type { TerminalLog } from "../application/services/terminal/terminalLaunchLog";
import type { ArtifactCaptureTrigger } from "../application/terminal/artifactCaptureTrigger";
import type { SessionSettingsRemover } from "../application/terminal/sessionSettings";
import { isActiveSession } from "../application/terminal/terminalSessionStatus";

export type TerminalEventDeps = { events: TerminalEventDao; settings: SessionSettingsRemover; capture: ArtifactCaptureService; log: TerminalLog; now?: () => Date };

export class TerminalEventController {
  constructor(private readonly deps: TerminalEventDeps) {}

  async authenticate(token: string | null): Promise<{ sessionId: string; active: boolean } | null> {
    const session = token ? await this.deps.events.findByTokenHash(hashSessionToken(token)) : null;
    if (!session) this.deps.log.tokenRejected({ hasToken: token !== null });
    return session ? { sessionId: session.id, active: isActiveSession(session.status) } : null;
  }

  async dropOversized(sessionId: string): Promise<void> {
    await this.deps.events.incrementDropped(sessionId);
    this.deps.log.eventDropped({ sessionId, reason: "oversized" });
  }

  async ingest(sessionId: string, payload: unknown): Promise<{ captureTrigger: ArtifactCaptureTrigger | null }> {
    const plan = await this.deps.events.withLockedSession(sessionId, async (session, writer) => {
      const now = (this.deps.now ?? (() => new Date()))();
      const planned = planIngestion({ session, summarized: summarizeHookEvent(payload, session.checkoutPath), now });
      if (!planned.changes) return planned;
      await writer.insertEvents(sessionId, planned.events, now);
      await writer.updateSession(sessionId, planned.changes);
      return planned;
    });
    if (plan?.sessionEnded) await this.deps.settings.remove(sessionId).catch(() => undefined);
    return { captureTrigger: plan?.captureTrigger ?? null };
  }

  async capture(sessionId: string, trigger: ArtifactCaptureTrigger): Promise<void> {
    try {
      await this.deps.capture.capture({ sessionId, trigger });
    } catch (error) {
      this.deps.log.captureFailed({ sessionId, reason: error instanceof Error ? error.message : "unknown" });
    }
  }
}
