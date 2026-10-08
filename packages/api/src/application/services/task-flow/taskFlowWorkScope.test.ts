import { describe, expect, it } from "vitest";
import { assertCurrentWorkScope, type CurrentWorkScope } from "./taskFlowWorkScope";

const scope = { projectId: "p1", taskId: "t1", actorId: "u1", sourceSnapshotId: "s1", claimRevision: 4 };
const current: CurrentWorkScope = { operatorUserId: "u1", claimState: "claimed", claimRevision: 4, sourceSnapshotId: "s1" };

describe("assertCurrentWorkScope", () => {
  it("allows only the current operator and claim/source revision", () => {
    expect(() => assertCurrentWorkScope(scope, current)).not.toThrow();
    expect(() => assertCurrentWorkScope({ ...scope, actorId: "author-admin" }, current)).toThrow(expect.objectContaining({ reason: "operator_required" }));
  });

  it("rejects unresolved claims and stale snapshots before acceptance", () => {
    expect(() => assertCurrentWorkScope(scope, { ...current, claimState: "uncertain" })).toThrow(expect.objectContaining({ reason: "claim_unresolved" }));
    expect(() => assertCurrentWorkScope(scope, { ...current, sourceSnapshotId: "s2" })).toThrow(expect.objectContaining({ reason: "source_changed" }));
    expect(() => assertCurrentWorkScope(scope, undefined)).toThrow(expect.objectContaining({ reason: "task_unavailable" }));
  });
});
