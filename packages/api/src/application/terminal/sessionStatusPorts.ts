import type { TerminalSessionRecord } from "../database/dao/terminalSessionDao";
import type { SessionSignal } from "../services/terminal/sessionSignals";
import type { TerminalSessionStatus } from "./terminalSessionStatus";

export type SessionControlRow = { id: string; status: TerminalSessionStatus; interruptRequestedAt: Date | null; endRequestedAt: Date | null };
export type StatusTransition = { from: TerminalSessionStatus; to: TerminalSessionStatus };
export type EndInput = { sessionId: string; reason: string; at: Date };
export type ResumeClaim = { sessionId: string; workerId: string };

export interface SessionStatusDao {
  transition(sessionId: string, signal: SessionSignal): Promise<StatusTransition | null>;
  controlRequests(sessionIds: string[]): Promise<SessionControlRow[]>;
  markEnded(input: EndInput): Promise<boolean>;
  listInterrupted(hostId: string): Promise<TerminalSessionRecord[]>;
  claimResume(input: ResumeClaim): Promise<TerminalSessionRecord | null>;
}
