import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export type AuthenticatedSession = { id: string; status: TerminalSessionStatus; checkoutPath: string };

export type LockedSession = {
  id: string;
  status: TerminalSessionStatus;
  checkoutPath: string;
  activeSkill: string | null;
  startedAt: Date | null;
  captureFolder: string | null;
};

export type NewTerminalEvent = { kind: TerminalEventKind; summary: string; path: string | null; skill: string | null };

export type SessionChanges = {
  status?: TerminalSessionStatus;
  activeSkill?: string | null;
  claudeSessionId?: string;
  startedAt?: Date;
  endedAt?: Date;
  endReason?: string;
  lastSignalAt: Date;
};

export interface TerminalEventWriter {
  insertEvents(sessionId: string, events: NewTerminalEvent[], occurredAt: Date): Promise<void>;
  updateSession(sessionId: string, changes: SessionChanges): Promise<void>;
}

export interface TerminalEventDao {
  findByTokenHash(hash: string): Promise<AuthenticatedSession | null>;
  incrementDropped(sessionId: string): Promise<void>;
  withLockedSession<T>(sessionId: string, work: (session: LockedSession, writer: TerminalEventWriter) => Promise<T>): Promise<T | null>;
}
