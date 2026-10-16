import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../client";

vi.mock("../assigned-issues/identityLock", () => ({ lockIdentity: vi.fn(async () => {}) }));

import { lockIdentity } from "../assigned-issues/identityLock";
import { reserveClaim } from "../assigned-issues/claimReservation";
import { reserveDeletion } from "./deletionReservation";
import type { ReserveDeletionInput } from "../../../../application/database/dao/issueDeletionDao";

const identity = { projectId: "10000000-0000-4000-8000-000000000001", repositoryId: "101", repositoryNodeId: "R_101", issueNodeId: "I_41" };

const swallowed: unknown[] = [];
const stop = () => { throw new Error("boundary-stop"); };
const fakeTx = { select: stop, execute: stop, insert: stop, update: stop } as unknown as Database;
const database = { transaction: async (callback: (tx: Database) => Promise<unknown>) => { try { await callback(fakeTx); } catch (error) { swallowed.push(error); } } } as unknown as Database;

describe("deletion reservation shares the identity lock with queue claims", () => {
  beforeEach(() => { swallowed.length = 0; vi.clearAllMocks(); });

  it("UT-027 queue claim and deletion reservation serialize on one identity lock", async () => {
    await reserveClaim(database, {
      source: { identity, issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", snapshot: { title: "Issue 41", bodyMarkdown: "Body 41", githubUpdatedAt: new Date(), contentHash: "hash", verifiedAt: new Date(), verifiedByUserId: null } },
      claimantUserId: "20000000-0000-4000-8000-000000000001",
      requestKey: crypto.randomUUID(),
      payloadHash: "payload",
      board: { boardNodeId: "board", boardItemId: "item", statusFieldId: "field", optionId: "ready" },
    });

    const deletion: ReserveDeletionInput = {
      projectId: identity.projectId,
      initiatorUserId: "20000000-0000-4000-8000-000000000001",
      requestKey: crypto.randomUUID(),
      reservation: { kind: "queue", ...identity, issueNumber: 41 },
      remotePresence: "present",
    };
    await reserveDeletion(database, deletion);

    expect(lockIdentity).toHaveBeenCalledTimes(2);
    const mockedLock = vi.mocked(lockIdentity);
    const [claimLock, deletionLock] = mockedLock.mock.calls;
    expect(claimLock).toBeDefined();
    expect(deletionLock).toBeDefined();
    expect(deletionLock![1]).toEqual(claimLock![1]);
    expect(deletionLock![1]).toMatchObject({ projectId: identity.projectId, repositoryId: "101", issueNodeId: "I_41" });
  });
});
