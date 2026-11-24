import { describe, expect, it } from "vitest";
import type { SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import { mapAnswerToPermissionResult } from "./answerMapper";

function request(alwaysScope: "project" | "machine"): SessionRequestRecord {
  return { id: "request", sessionId: "session", kind: "permission", status: "answered", toolUseId: "tool", payload: { toolName: "Bash", permissionKind: "command", title: "Rodar", body: "pnpm test", truncated: false, suggestedRule: "Bash(pnpm test:*)", suggestions: [{ type: "command", command: "pnpm test" }], offers: ["allow", "allow_always", "deny"], alwaysScope }, answer: null, answeredBy: null, answeredAt: null, createdAt: new Date() };
}

describe("permission answer scopes", () => {
  it("keeps Codex session approval ephemeral and preserves its machine rule", () => {
    const input = { command: "pnpm test" };
    const session = mapAnswerToPermissionResult(request("machine"), { decision: "allow_session" }, input);
    const always = mapAnswerToPermissionResult(request("machine"), { decision: "allow_always" }, input);
    expect(session).toEqual({ behavior: "allow", decision: "allow_session" });
    expect(always).toEqual({ behavior: "allow", decision: "allow_always", scope: "machine", updatedPermissions: [{ type: "command", command: "pnpm test" }] });
  });

  it("keeps Claude persistent approval in project local settings", () => {
    expect(mapAnswerToPermissionResult(request("project"), { decision: "allow_always" }, {})).toMatchObject({ behavior: "allow", updatedPermissions: [{ destination: "localSettings" }] });
  });
});
