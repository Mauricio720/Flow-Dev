import { describe, expect, it } from "vitest";
import type { RuntimePermissionRequest } from "../../../terminal/agentSessionRuntime";
import { translateCodexApproval } from "./codexApprovalTranslator";
import { translateCodexApprovalResult } from "./codexApprovalResult";

const request = () => translateCodexApproval("item/commandExecution/requestApproval", { threadId: "t", turnId: "u", itemId: "i", command: "pnpm lint", proposedExecpolicyAmendment: ["Bash(pnpm lint:*)"], availableDecisions: ["accept", "acceptForSession", { acceptWithExecpolicyAmendment: {} }, "decline"] })!;

describe("Codex approval result translation", () => {
  it("maps allow, session allow and machine allow to the offered protocol decisions", () => {
    expect(translateCodexApprovalResult(request(), { behavior: "allow", updatedInput: { command: "pnpm lint" } })).toEqual({ decision: "accept" });
    expect(translateCodexApprovalResult(request(), { behavior: "allow", decision: "allow_session" })).toEqual({ decision: "acceptForSession" });
    expect(translateCodexApprovalResult(request(), { behavior: "allow", decision: "allow_always", scope: "machine", updatedPermissions: ["Bash(pnpm lint:*)"] })).toEqual({ decision: { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["Bash(pnpm lint:*)"] } } });
  });

  it("declines without an unknown RPC field and refuses unoffered decisions", () => {
    expect(translateCodexApprovalResult(request(), { behavior: "deny", message: "Não execute" })).toEqual({ decision: "decline" });
    const restricted: RuntimePermissionRequest = { ...request(), offers: ["allow", "deny"] };
    expect(translateCodexApprovalResult(restricted, { behavior: "allow", decision: "allow_session" })).toBeNull();
  });
});
