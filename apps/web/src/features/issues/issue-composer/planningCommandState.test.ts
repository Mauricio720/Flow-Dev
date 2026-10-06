import { describe, expect, it } from "vitest";
import { blocksApproval, commandReducer, IDLE_COMMAND, keyedCommand, type PendingCommand } from "./planningCommandState";

const base = { action: "planning.selectRoute" as const, taskId: "t", expectedVersion: 10, decisionId: "d", expectedDecisionVersion: 1, route: "prd" as const };
const pending: PendingCommand = { ...base, requestKey: "key-1" };

describe("planning command state", () => {
  it("UT-048 keeps the exact key for a resend after not_accepted", () => {
    const sending = commandReducer(IDLE_COMMAND, { type: "begin", pending });
    const uncertain = commandReducer(sending, { type: "unconfirmed" });
    const unconfirmed = commandReducer(uncertain, { type: "not_accepted" });
    expect(unconfirmed).toMatchObject({ phase: "resend", pending });
    expect(keyedCommand(unconfirmed, base).requestKey).toBe("key-1");
    expect(keyedCommand(unconfirmed, { ...base, route: "tech_spec" }).requestKey).not.toBe("key-1");
  });

  it("UT-049 clears the success claim on conflict and requires a new review", () => {
    const accepted = commandReducer(commandReducer(IDLE_COMMAND, { type: "begin", pending }), { type: "accepted" });
    expect(accepted.claimedSaved).toBe(true);
    const conflict = commandReducer(accepted, { type: "conflict" });
    expect(conflict).toMatchObject({ phase: "conflict", claimedSaved: false, pending: null });
    expect(blocksApproval(conflict)).toBe(true);
    expect(blocksApproval(commandReducer(conflict, { type: "reviewed" }))).toBe(false);
  });

  it("mints a fresh key once the previous command settled", () => {
    expect(keyedCommand(IDLE_COMMAND, base).requestKey).toEqual(expect.any(String));
    expect(keyedCommand(IDLE_COMMAND, base).requestKey).not.toBe(keyedCommand(IDLE_COMMAND, base).requestKey);
  });
});
