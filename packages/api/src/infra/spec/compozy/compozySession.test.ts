import { describe, expect, it } from "vitest";
import { createSession } from "./compozySession";
import { CompozyTransportError, type CompozyRequest, type CompozyTransport } from "./compozyTransport";

const input = { socketPath: "/run/daemon.sock", workspaceRoot: "/checkout", workspaceName: "flow-task", agentName: "agent", sessionName: "run-1" };
const WORKSPACES_PATH = "/api/workspaces";

function transportWith(register: (request: CompozyRequest) => Promise<{ status: number; body: unknown }>, listed: unknown[] = []): CompozyTransport {
  return async (request) => {
    if (request.method === "POST" && request.path === WORKSPACES_PATH) return register(request) as never;
    if (request.method === "GET" && request.path === WORKSPACES_PATH) return { status: 200, body: { workspaces: listed } } as never;
    return { status: 201, body: { session: { id: "session-1", name: input.sessionName, state: "active" } } } as never;
  };
}

describe("createSession workspace registration", () => {
  it("fails for certain when the runtime answers but refuses to register the checkout", async () => {
    const refused = transportWith(async () => ({ status: 500, body: { error: "unsupported .env content" } }));
    await expect(createSession(refused, input)).rejects.toMatchObject({ reason: "workspace_unavailable", uncertain: false, message: "O CompozyOS recusou abrir o projeto: unsupported .env content" });
  });

  it("stays uncertain when the registration request never got an answer", async () => {
    const silent = transportWith(async () => { throw new CompozyTransportError("timeout", "no answer"); });
    await expect(createSession(silent, input)).rejects.toMatchObject({ reason: "outcome_unknown", uncertain: true });
  });

  it("reuses the workspace the runtime already has for the checkout", async () => {
    const conflict = transportWith(async () => ({ status: 409, body: {} }), [{ id: "workspace-1", root_dir: input.workspaceRoot, name: input.workspaceName }]);
    expect(await createSession(conflict, input)).toMatchObject({ workspaceId: "workspace-1" });
  });
});
