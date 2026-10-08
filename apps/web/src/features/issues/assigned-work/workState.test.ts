import { describe, expect, it } from "vitest";
import { snapshotOf } from "@/test/work";
import { initialWorkState, lostAccess, workPollInterval, workReducer } from "./workState";

const ready = () => initialWorkState({ kind: "ready", snapshot: snapshotOf() });

describe("work state", () => {
  it.each([
    [{ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" }],
    [{ code: "NOT_FOUND", reason: "work_unavailable" }],
    [{ code: "FORBIDDEN", reason: "access_revoked" }],
    [{ code: "UNAUTHORIZED", reason: "session_required" }],
  ])("clears private work for %o", (failure) => {
    expect(workReducer(ready(), { type: "failed", failure }).snapshot).toBeNull();
    expect(lostAccess(failure)).toBe(true);
  });

  it("keeps the last confirmed work on a transient failure", () => {
    const next = workReducer(ready(), { type: "failed", failure: { code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" } });
    expect(next.snapshot).not.toBeNull();
  });

  it("polls an unresolved claim faster than idle work and stops after access loss", () => {
    const pending = initialWorkState({ kind: "ready", snapshot: snapshotOf({ claim: { taskId: "t", state: "pending", operatorId: null, reason: null } }) });
    expect(workPollInterval(pending)).toBe(5_000);
    expect(workPollInterval(ready())).toBe(15_000);
    expect(workPollInterval(workReducer(ready(), { type: "failed", failure: { code: "NOT_FOUND", reason: "work_unavailable" } }))).toBeNull();
  });
});
