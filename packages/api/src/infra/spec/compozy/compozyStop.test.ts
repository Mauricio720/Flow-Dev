import { describe, expect, it } from "vitest";
import { inspectSession } from "./compozyStop";
import type { CompozyTransport } from "./compozyTransport";

const identity = { socketPath: "/run/daemon.sock", workspaceId: "workspace-1", sessionId: "session-1" };
const BIND_FAILURE = 'acp: config option "mode" does not allow value "agent-full-access"';

function transportWith(runtime: Record<string, unknown> | undefined, session: Record<string, unknown> = {}): CompozyTransport {
  return async (request) => {
    if (request.path.endsWith("/interactions")) return { status: 200, body: { interactions: [] } };
    return { status: 200, body: { session: { id: identity.sessionId, state: "active", ...session, ...(runtime ? { runtime } : {}) } } };
  };
}

describe("inspectSession start failure", () => {
  it("reports why the agent runtime never bound to the session", async () => {
    const snapshot = await inspectSession(transportWith({ status: "unbound", failure: BIND_FAILURE, selection_revision: 0 }), identity);
    expect(snapshot.startFailure).toBe(BIND_FAILURE);
  });

  it("reports no start failure for a bound or not yet described runtime", async () => {
    expect((await inspectSession(transportWith({ status: "bound" }), identity)).startFailure).toBeNull();
    expect((await inspectSession(transportWith(undefined), identity)).startFailure).toBeNull();
  });
});

describe("inspectSession unbound runtime", () => {
  const CREATED_AT = "2026-10-15T16:56:23.599Z";

  it("reports since when a session without a queued prompt still has no runtime", async () => {
    const snapshot = await inspectSession(transportWith({ status: "unbound" }, { created_at: CREATED_AT, queue: { entries: 0, cap: 10 } }), identity);
    expect(snapshot.unboundSince).toBe(CREATED_AT);
  });

  it("does not report a session that is binding, failed to bind or holds a queued prompt", async () => {
    expect((await inspectSession(transportWith({ status: "binding" }, { created_at: CREATED_AT }), identity)).unboundSince).toBeNull();
    expect((await inspectSession(transportWith({ status: "unbound", failure: BIND_FAILURE }, { created_at: CREATED_AT }), identity)).unboundSince).toBeNull();
    expect((await inspectSession(transportWith({ status: "unbound" }, { created_at: CREATED_AT, queue: { entries: 1, cap: 10 } }), identity)).unboundSince).toBeNull();
  });
});
