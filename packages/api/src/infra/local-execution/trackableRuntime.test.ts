import { describe, expect, it } from "vitest";
import { trackableRuntime } from "./trackableRuntime";

const runtime = { workspaceId: "ws-1", sessionId: "session-1", turnId: null };

describe("trackableRuntime", () => {
  it("keeps watching a run whose prompt answer was lost after the session was created", () => {
    expect(trackableRuntime({ kind: "unknown", runtime })).toEqual(runtime);
    expect(trackableRuntime({ kind: "submitted", runtime })).toEqual(runtime);
  });

  it("does not watch a run that never got a session or was refused", () => {
    expect(trackableRuntime({ kind: "unknown" })).toBeNull();
    expect(trackableRuntime({ kind: "unknown", runtime: { workspaceId: "ws-1" } })).toBeNull();
    expect(trackableRuntime({ kind: "blocked", code: "model_unavailable" })).toBeNull();
    expect(trackableRuntime({ kind: "failed", code: "runtime_failed" })).toBeNull();
  });
});
