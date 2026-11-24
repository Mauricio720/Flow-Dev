import type { RuntimePermissionRequest } from "../../../terminal/agentSessionRuntime";
import type { PermissionDecision } from "../../../terminal/sessionInteraction";
import path from "node:path";

export type CodexCommandApproval = { threadId: string; turnId: string; itemId: string; command?: string | null; cwd?: string | null; commandActions?: Array<{ type: string; path?: string | null }>; reason?: string | null; proposedExecpolicyAmendment?: string[] | null; availableDecisions?: unknown[] | null; additionalPermissions?: unknown };
export type CodexFileChange = { path: string; kind: { type: "add" | "delete" } | { type: "update"; move_path: string | null }; diff: string };
export type CodexFileApproval = { threadId: string; turnId: string; itemId: string; reason?: string | null; grantRoot?: string | null; changes?: CodexFileChange[] };
export type CodexExtraApproval = { threadId: string; turnId: string; itemId: string; cwd: string; reason: string | null; permissions: unknown };
export type CodexApprovalInput = CodexCommandApproval | CodexFileApproval | CodexExtraApproval;

const CHANGE_LABELS: Record<CodexFileChange["kind"]["type"], string> = { add: "Criar", delete: "Remover", update: "Editar" };
const READ_ACTIONS = new Set(["read", "listFiles", "search"]);

function commandOffers(approval: CodexCommandApproval): PermissionDecision[] {
  const decisions = approval.availableDecisions ?? [];
  const offers: PermissionDecision[] = [];
  if (decisions.includes("accept")) offers.push("allow");
  if (decisions.includes("acceptForSession")) offers.push("allow_session");
  if (decisions.includes("decline")) offers.push("deny");
  if (hasExecPolicy(decisions) && (approval.proposedExecpolicyAmendment?.length ?? 0) > 0) offers.push("allow_always");
  if (approval.additionalPermissions) return offers.filter((offer) => offer === "allow" || offer === "deny");
  return offers;
}

function hasExecPolicy(decisions: unknown[]): boolean {
  return decisions.some((decision) => typeof decision === "object" && decision !== null && "acceptWithExecpolicyAmendment" in decision);
}

function commandRequest(approval: CodexCommandApproval): RuntimePermissionRequest {
  const amendment = approval.proposedExecpolicyAmendment ?? [];
  const extra = Boolean(approval.additionalPermissions);
  return { toolName: extra ? "extraPermission" : "Bash", permissionKind: extra ? "extra_permission" : "command", input: { command: approval.command ?? "", description: approval.reason ?? "", ...(extra ? { permissions: approval.additionalPermissions, reason: approval.reason } : {}) }, toolUseId: approval.itemId, suggestions: extra ? [] : amendment, offers: extra ? commandOffers(approval).filter((offer) => offer !== "allow_session" && offer !== "allow_always") : commandOffers(approval), alwaysScope: extra || amendment.length === 0 ? null : "machine" };
}

function changeText(changes: CodexFileChange[] = []): string {
  return changes.flatMap((change) => {
    const move = change.kind.type === "update" && change.kind.move_path ? ` → ${change.kind.move_path}` : "";
    return [`${CHANGE_LABELS[change.kind.type]}: ${change.path}${move}`, change.diff];
  }).join("\n");
}

function fileRequest(approval: CodexFileApproval): RuntimePermissionRequest {
  const grantRoot = approval.grantRoot ?? "";
  const diff = changeText(approval.changes);
  const description = grantRoot ? `Acesso solicitado fora do clone: ${grantRoot}${approval.reason ? `\n${approval.reason}` : ""}` : approval.reason ?? "";
  const offers: PermissionDecision[] = grantRoot ? ["allow", "deny"] : ["allow", "allow_session", "deny"];
  return { toolName: "fileChange", permissionKind: "file_change", input: { diff: [description, diff].filter(Boolean).join("\n\n"), description, grantRoot }, toolUseId: approval.itemId, suggestions: [], offers, alwaysScope: null };
}

function extraRequest(approval: CodexExtraApproval): RuntimePermissionRequest {
  return { toolName: "extraPermission", permissionKind: "extra_permission", input: { cwd: approval.cwd, reason: approval.reason, permissions: approval.permissions, description: approval.reason ?? JSON.stringify(approval.permissions) }, toolUseId: approval.itemId, suggestions: [], offers: ["allow", "deny"], alwaysScope: null };
}

export function translateCodexApproval(method: string, params: CodexApprovalInput): RuntimePermissionRequest | null {
  if (method === "item/commandExecution/requestApproval") return commandRequest(params as CodexCommandApproval);
  if (method === "item/fileChange/requestApproval") return fileRequest(params as CodexFileApproval);
  if (method === "item/permissions/requestApproval") return extraRequest(params as CodexExtraApproval);
  return null;
}

function isInside(checkoutPath: string, cwd: string, requestedPath: string | null) {
  const root = path.resolve(checkoutPath);
  const target = path.resolve(cwd, requestedPath ?? ".");
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeReadActions(approval: CodexCommandApproval, checkoutPath: string) {
  const actions = approval.commandActions ?? [];
  return !approval.additionalPermissions && actions.length > 0 && actions.every((action) => READ_ACTIONS.has(action.type) && isInside(checkoutPath, approval.cwd ?? checkoutPath, action.path ?? null));
}

function safeFileChanges(approval: CodexFileApproval, checkoutPath: string) {
  const changes = approval.changes ?? [];
  return approval.grantRoot == null && changes.length > 0 && changes.every((change) => isInside(checkoutPath, checkoutPath, change.path) && (change.kind.type !== "update" || !change.kind.move_path || isInside(checkoutPath, checkoutPath, change.kind.move_path)));
}

export function codexApprovalCanAutoAccept(input: { method: string; params: CodexApprovalInput; permissionMode: "bypass" | "accept_edits" | "ask_all"; checkoutPath: string }) {
  if (input.permissionMode === "bypass") return true;
  if (input.method === "item/commandExecution/requestApproval") return safeReadActions(input.params as CodexCommandApproval, input.checkoutPath);
  return input.permissionMode === "accept_edits" && input.method === "item/fileChange/requestApproval" && safeFileChanges(input.params as CodexFileApproval, input.checkoutPath);
}
