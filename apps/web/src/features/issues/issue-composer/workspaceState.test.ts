import { describe, expect, it } from "vitest";
import { T, P, reviewDetail } from "@/test/tasks";
import { pollInterval, taskScope, workspaceReducer, type WorkspaceState } from "./workspaceState";

const scope = taskScope(P, T);
const snapshotAt = (version: number) => ({ detail: reviewDetail({}, version), messages: [], moreMessages: null });
const ready = (version: number): WorkspaceState => ({ scope, phase: "ready", snapshot: snapshotAt(version), failure: null });

describe("workspace reducer and polling", () => {
  it("UT-051 keeps version 12 when version 11 arrives later", () => {
    const state = workspaceReducer(ready(12), { type: "loaded", scope, snapshot: snapshotAt(11) });
    expect(state.snapshot?.detail.task.version).toBe(12);
    expect(workspaceReducer(state, { type: "loaded", scope, snapshot: snapshotAt(13) }).snapshot?.detail.task.version).toBe(13);
  });

  it("UT-053 keeps the last confirmed review through a transient failure", () => {
    const state = workspaceReducer(ready(12), { type: "failed", scope, failure: { code: null, reason: null } });
    expect(state).toMatchObject({ phase: "ready", failure: { code: null } });
    expect(state.snapshot?.detail.planning.decision?.id).toBeDefined();
  });

  it.each([[{ code: "UNAUTHORIZED", reason: "session_required" }], [{ code: "NOT_FOUND", reason: "project_unavailable" }], [{ code: "FORBIDDEN", reason: "access_revoked" }], [{ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" }]])("UT-054 clears protected content for %o", (failure) => {
    const state = workspaceReducer(ready(12), { type: "failed", scope, failure });
    expect(state).toMatchObject({ phase: "failed", snapshot: null, failure });
  });

  it("UT-055 polls active planning every 2s and other planning states every 15s", () => {
    expect(pollInterval("published", "in_progress")).toBe(2_000);
    for (const status of ["awaiting", "review", "failed", "approved"] as const) expect(pollInterval("published", status)).toBe(15_000);
    expect(pollInterval("generating")).toBe(2_000);
    expect(pollInterval(null)).toBeNull();
  });
});
