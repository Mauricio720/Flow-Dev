export type LinkRequestState = "pending" | "claimed" | "linked" | "failed";
export type LinkRequestOutcome = Extract<LinkRequestState, "linked" | "failed">;
export type LinkRequestRecord = {
  id: string;
  ownerUserId: string;
  projectId: string;
  machineId: string | null;
  expectedRevision: number;
  state: LinkRequestState;
  reason: string | null;
  expiresAt: Date;
};

export interface LocalLinkRequestDao {
  open(input: { ownerUserId: string; projectId: string; expectedRevision: number; expiresAt: Date }): Promise<LinkRequestRecord>;
  latest(input: { ownerUserId: string; projectId: string }): Promise<LinkRequestRecord | null>;
  claim(input: { ownerUserId: string; machineId: string; now: Date }): Promise<LinkRequestRecord | null>;
  settle(input: { requestId: string; machineId: string; state: LinkRequestOutcome; reason: string | null }): Promise<boolean>;
}
