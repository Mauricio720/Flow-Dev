import { describe, expect, it } from "vitest";
import { suggestedRuleOf } from "../permissionRuleText";
import { summarizePermissionRequest } from "../permissionRequestSummarizer";
import { codexApprovalCanAutoAccept, translateCodexApproval } from "./codexApprovalTranslator";

const command = (extra: Record<string, unknown> = {}) => ({ threadId: "thread", turnId: "turn", itemId: "item", command: "pnpm lint", reason: "Validar o código", proposedExecpolicyAmendment: ["Bash(pnpm lint:*)"], availableDecisions: ["accept", "acceptForSession", { acceptWithExecpolicyAmendment: {} }, "decline"], ...extra });

describe("Codex approval request translation", () => {
  it("maps command requests and retains the exact proposed rule and offered decisions", () => {
    const request = translateCodexApproval("item/commandExecution/requestApproval", command())!;
    expect(request).toMatchObject({ toolName: "Bash", permissionKind: "command", input: { command: "pnpm lint", description: "Validar o código" }, suggestions: ["Bash(pnpm lint:*)"], offers: ["allow", "allow_session", "deny", "allow_always"], alwaysScope: "machine" });
    expect(suggestedRuleOf(request.suggestions)).toBe("Bash(pnpm lint:*)");
    expect(summarizePermissionRequest({ toolName: request.toolName, input: request.input, cwd: "/clone" })).toMatchObject({ title: "Rodar comando:", body: "pnpm lint\n\nValidar o código" });
    expect(translateCodexApproval("item/commandExecution/requestApproval", command({ proposedExecpolicyAmendment: null }))!.offers).toEqual(["allow", "allow_session", "deny"]);
  });

  it("shows every file path, change type, move destination and grantRoot without a session grant", () => {
    const request = translateCodexApproval("item/fileChange/requestApproval", { threadId: "t", turnId: "u", itemId: "i", reason: "Necessário", grantRoot: "/outside", changes: [{ path: "/clone/a", kind: { type: "update", move_path: "/clone/b" }, diff: "-old\n+new" }] })!;
    const display = summarizePermissionRequest({ toolName: request.toolName, input: request.input, cwd: "/clone" });
    expect(request).toMatchObject({ permissionKind: "file_change", offers: ["allow", "deny"], alwaysScope: null });
    expect(display).toMatchObject({ title: "Alterar arquivos:", body: expect.stringContaining("/outside") });
    expect(display.body).toContain("/clone/a → /clone/b");
    expect(display.body).toContain("-old\n+new");
  });

  it("limits extra permissions and command permission overlays to allow and deny", () => {
    const extra = translateCodexApproval("item/permissions/requestApproval", { threadId: "t", turnId: "u", itemId: "i", cwd: "/clone", reason: "Acessar a rede", permissions: { network: { enabled: true } } })!;
    const overlay = translateCodexApproval("item/commandExecution/requestApproval", command({ additionalPermissions: { network: { enabled: true } } }))!;
    expect(extra).toMatchObject({ toolName: "extraPermission", permissionKind: "extra_permission", offers: ["allow", "deny"], alwaysScope: null });
    expect(overlay.offers).toEqual(["allow", "deny"]);
    expect(summarizePermissionRequest({ toolName: extra.toolName, input: extra.input, cwd: "/clone" }).body).toContain("Acessar a rede");
  });

  it("auto-accepts only safe reads within the clone and file changes in accept_edits", () => {
    const commandRequest = { method: "item/commandExecution/requestApproval", params: command({ cwd: "/clone", commandActions: [{ type: "read", path: "/clone/README.md" }] }) };
    const changeRequest = { method: "item/fileChange/requestApproval", params: { threadId: "t", turnId: "u", itemId: "i", changes: [{ path: "/clone/a", kind: { type: "add" }, diff: "+a" }] } };
    expect(codexApprovalCanAutoAccept({ ...commandRequest, permissionMode: "ask_all", checkoutPath: "/clone" })).toBe(true);
    expect(codexApprovalCanAutoAccept({ ...commandRequest, params: command({ cwd: "/clone", commandActions: [{ type: "unknown", path: "/clone/README.md" }] }), permissionMode: "ask_all", checkoutPath: "/clone" })).toBe(false);
    expect(codexApprovalCanAutoAccept({ ...commandRequest, params: command({ cwd: "/clone", commandActions: [{ type: "read", path: "/etc/passwd" }] }), permissionMode: "accept_edits", checkoutPath: "/clone" })).toBe(false);
    expect(codexApprovalCanAutoAccept({ ...changeRequest, permissionMode: "accept_edits", checkoutPath: "/clone" })).toBe(true);
    expect(codexApprovalCanAutoAccept({ ...changeRequest, permissionMode: "ask_all", checkoutPath: "/clone" })).toBe(false);
    expect(codexApprovalCanAutoAccept({ ...changeRequest, permissionMode: "bypass", checkoutPath: "/clone" })).toBe(true);
  });
});
