import type { TerminalSessionRecord } from "../database/dao/terminalSessionDao";
import type { MessageRole, RequestKind, RequestPayload, RequestStatus } from "./sessionInteraction";
import type { CodexStatus } from "./codexCatalog";

export type SessionMessageRecord = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  truncated: boolean;
  requestKey: string | null;
  deliveredAt: Date | null;
  undelivered: boolean;
  occurredAt: Date;
};

export type SessionRequestRecord = {
  id: string;
  sessionId: string;
  kind: RequestKind;
  toolUseId: string;
  payload: RequestPayload;
  status: RequestStatus;
  answer: unknown;
  answeredBy: string | null;
  createdAt: Date;
  answeredAt: Date | null;
};

export type InsertUserMessageInput = { sessionId: string; content: string; requestKey: string };
export type InsertAssistantMessageInput = { sessionId: string; content: string; truncated: boolean; occurredAt?: Date };
export type InsertSystemMessageInput = { sessionId: string; content: string; occurredAt?: Date };
export type InsertedUserMessage = { message: SessionMessageRecord; created: boolean };
export type InsertRequestInput = { sessionId: string; kind: RequestKind; toolUseId: string; payload: RequestPayload };
export type AnswerRequestInput = { requestId: string; answer: unknown; answeredBy: string; at: Date };
export type HostBeat = { hostId: string; workerId: string; heartbeatAt: Date };
export type ClaimInput = { hostId: string; workerId: string };
export type ControlKind = "interrupt" | "end";

export interface SessionMessageDao {
  insertUserMessage(input: InsertUserMessageInput): Promise<InsertedUserMessage>;
  insertAssistantMessage(input: InsertAssistantMessageInput): Promise<SessionMessageRecord>;
  insertSystemMessage(input: InsertSystemMessageInput): Promise<SessionMessageRecord>;
  listUndelivered(sessionId: string): Promise<SessionMessageRecord[]>;
  markDelivered(messageIds: string[], at: Date): Promise<void>;
  markUndelivered(messageIds: string[]): Promise<void>;
}

export interface SessionRequestDao {
  insertRequest(input: InsertRequestInput): Promise<SessionRequestRecord>;
  findById(requestId: string): Promise<SessionRequestRecord | null>;
  answerIfPending(input: AnswerRequestInput): Promise<SessionRequestRecord | null>;
  cancelPending(sessionId: string, at: Date): Promise<string[]>;
  listAnsweredFor(requestIds: string[]): Promise<SessionRequestRecord[]>;
  pendingIds(sessionId: string): Promise<string[]>;
}

export interface SessionHostDao {
  beat(input: HostBeat): Promise<void>;
  lastBeat(hostId: string): Promise<HostBeat | null>;
  codexStatus(hostId: string): Promise<CodexStatus | null>;
  publishCodexStatus(input: { hostId: string; status: CodexStatus }): Promise<void>;
}

export interface SessionControlDao {
  claimOpening(input: ClaimInput): Promise<TerminalSessionRecord | null>;
  requestInterrupt(sessionId: string, at: Date): Promise<boolean>;
  requestEnd(sessionId: string, at: Date): Promise<boolean>;
  clearControl(sessionId: string, kind: ControlKind): Promise<void>;
  markOrphans(input: ClaimInput): Promise<string[]>;
}
