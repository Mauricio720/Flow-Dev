import type { ArtifactCaptureTrigger } from "../../terminal/artifactCaptureTrigger";
import type { HookPayload } from "../../terminal/agentSessionRuntime";
import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { CaptureCandidate } from "./artifactCapturePlan";
import type { RouteSwitchService } from "./routeSwitchService";
import { MAX_STORED_TEXT_LENGTH, truncateWithMarker } from "./sessionInteractionLimits";
import { errorFields, type SessionLog } from "./sessionLog";
import { parseRouteSwitchBlock } from "./routeSwitchBlock";

export type RecorderEvents = {
  ingest(sessionId: string, payload: unknown): Promise<{ captureTrigger: ArtifactCaptureTrigger | null }>;
  capture(sessionId: string, trigger: ArtifactCaptureTrigger, extra?: CaptureCandidate[]): Promise<void>;
};

export type RecorderDeps = { messages: Pick<SessionMessageDao, "insertAssistantMessage">; events: RecorderEvents; routeSwitches?: Pick<RouteSwitchService, "propose">; log: SessionLog };
const STOP_CAPTURE_TRIGGER = "stop";

export class SessionRecorder {
  constructor(private readonly deps: RecorderDeps) {}

  async text(sessionId: string, text: string) {
    let assistantMessageId: string | null = null;
    try {
      const stored = truncateWithMarker(text, MAX_STORED_TEXT_LENGTH);
      const message = await this.deps.messages.insertAssistantMessage({ sessionId, content: stored.text, truncated: stored.truncated });
      assistantMessageId = message.id;
    } catch (error) {
      this.deps.log.error("record_text_failed", { sessionId, ...errorFields(error) });
    }
    if (assistantMessageId) await this.detectRouteSwitch(sessionId, assistantMessageId, text);
  }

  private async detectRouteSwitch(sessionId: string, assistantMessageId: string, text: string) {
    if (!this.deps.routeSwitches) return;
    const { block } = parseRouteSwitchBlock(text);
    if (!block) return;
    try {
      await this.deps.routeSwitches.propose({ sessionId, assistantMessageId, block });
    } catch (error) {
      this.deps.log.error("route_switch_detect_failed", { sessionId, ...errorFields(error) });
    }
  }

  async hook(sessionId: string, payload: HookPayload) {
    try {
      const { captureTrigger } = await this.deps.events.ingest(sessionId, payload);
      if (captureTrigger) await this.deps.events.capture(sessionId, captureTrigger);
    } catch (error) {
      this.deps.log.error("record_hook_failed", { sessionId, hook: String(payload.hook_event_name), ...errorFields(error) });
    }
  }

  async captureEnd(sessionId: string) {
    try {
      await this.deps.events.capture(sessionId, "session_end");
    } catch (error) {
      this.deps.log.error("record_end_capture_failed", { sessionId, ...errorFields(error) });
    }
  }

  async captureStop(sessionId: string, extra: CaptureCandidate[] = []) {
    try {
      await this.deps.events.capture(sessionId, STOP_CAPTURE_TRIGGER, extra);
    } catch (error) {
      this.deps.log.error("record_stop_capture_failed", { sessionId, ...errorFields(error) });
    }
  }
}
