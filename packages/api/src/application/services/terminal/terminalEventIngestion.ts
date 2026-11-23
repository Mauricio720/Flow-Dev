import type { LockedSession, NewTerminalEvent, SessionChanges } from "../../database/dao/terminalEventDao";
import type { ArtifactCaptureTrigger } from "../../terminal/artifactCaptureTrigger";
import { isActiveSession, type TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { SummarizedHookEvent } from "./hookEventSummarizer";
import { applyTerminalEvent } from "./terminalSessionStateMachine";

const DEFAULT_START_SOURCE = "startup";

export type IngestionPlan = {
  events: NewTerminalEvent[];
  changes: SessionChanges | null;
  captureTrigger: ArtifactCaptureTrigger | null;
  sessionEnded: boolean;
};

const DISCARDED: IngestionPlan = { events: [], changes: null, captureTrigger: null, sessionEnded: false };

function withImplicitStart(summarized: SummarizedHookEvent, session: LockedSession): NewTerminalEvent[] {
  const events = summarized.events.filter((event) => !(event.kind === "started" && session.startedAt));
  const [first] = events;
  if (session.startedAt || !first || first.kind === "started" || first.kind === "ended") return events;
  return [{ kind: "started", summary: DEFAULT_START_SOURCE, path: null, skill: null }, ...events];
}

type Progress = { status: TerminalSessionStatus; activeSkill: string | null };

function advance(progress: Progress, event: NewTerminalEvent): { stored: NewTerminalEvent; progress: Progress } {
  const status = applyTerminalEvent(progress.status, event.kind) ?? progress.status;
  const activeSkill = event.kind === "skill" ? event.skill : progress.activeSkill;
  const stored = event.kind === "file_edit" ? { ...event, skill: progress.activeSkill } : event;
  return { stored, progress: { status, activeSkill } };
}

function sessionChanges(input: { session: LockedSession; summarized: SummarizedHookEvent; events: NewTerminalEvent[]; progress: Progress; now: Date }): SessionChanges {
  const { session, summarized, events, progress, now } = input;
  const changes: SessionChanges = { lastSignalAt: now };
  if (progress.status !== session.status) changes.status = progress.status;
  if (progress.activeSkill !== session.activeSkill) changes.activeSkill = progress.activeSkill;
  if (events.some((event) => event.kind === "started")) Object.assign(changes, { startedAt: now, ...(summarized.claudeSessionId ? { claudeSessionId: summarized.claudeSessionId } : {}) });
  if (events.some((event) => event.kind === "ended")) Object.assign(changes, { endedAt: now, endReason: summarized.endReason ?? "" });
  return changes;
}

export function planIngestion(input: { session: LockedSession; summarized: SummarizedHookEvent; now: Date }): IngestionPlan {
  const { session, summarized, now } = input;
  if (!isActiveSession(session.status)) return DISCARDED;
  const events = withImplicitStart(summarized, session);
  if (events.length === 0 && !summarized.captureTrigger) return DISCARDED;
  let progress: Progress = { status: session.status, activeSkill: session.activeSkill };
  const stored = events.map((event) => {
    const next = advance(progress, event);
    progress = next.progress;
    return next.stored;
  });
  if (summarized.captureTrigger === "stop") progress = { ...progress, activeSkill: null };
  const changes = sessionChanges({ session, summarized, events, progress, now });
  return { events: stored, changes, captureTrigger: summarized.captureTrigger, sessionEnded: progress.status === "ended" };
}
