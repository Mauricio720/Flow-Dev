import { describe, expect, it, vi } from "vitest";
import type { RuntimePermissionResult, RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { answerCodexRequest } from "./codexSessionRequests";

function input(permissionMode: RuntimeStartInput["permissionMode"]): RuntimeStartInput {
  return { sessionId: "s", cwd: "/clone", prompt: "start", contextDir: "/context", permissionMode, handlers: { onAssistantText: () => undefined, onHook: () => undefined, onPermission: vi.fn(async (): Promise<RuntimePermissionResult> => ({ behavior: "allow" })), onExit: () => undefined } };
}

const request = { threadId: "t", turnId: "u", itemId: "i", cwd: "/clone", reason: "network", startedAtMs: 1, permissions: { network: { enabled: true } } };

describe("Codex permissions request response", () => {
  it("returns the exact requested profile for automatic approval without a decision field", async () => {
    await expect(answerCodexRequest({ input: input("bypass"), method: "item/permissions/requestApproval", params: request })).resolves.toEqual({ permissions: request.permissions, scope: "turn" });
  });
});
