import type { SessionAgent } from "./sessionAgentCatalog";
import type { AlwaysPermissionScope, PermissionDecision, PermissionMode, PermissionRequestKind } from "./sessionInteraction";
import type { SessionPurposeKind } from "./sessionPurposeKind";

export type HookPayload = Record<string, unknown>;
export type RuntimePermissionRequest = { toolName: string; input: Record<string, unknown>; toolUseId: string; suggestions: unknown[]; permissionKind?: PermissionRequestKind; offers?: PermissionDecision[]; alwaysScope?: AlwaysPermissionScope | null };
export type RuntimePermissionResult =
  | { behavior: "allow"; updatedInput?: Record<string, unknown>; updatedPermissions?: unknown[] }
  | { behavior: "allow"; decision: "allow_session" }
  | { behavior: "allow"; decision: "allow_always"; scope: "machine"; updatedPermissions?: unknown[] }
  | { behavior: "deny"; message: string };
export type RuntimeExit = { kind: "ended" | "crashed" | "failed"; detail?: string };

export type RuntimeHandlers = {
  onAgentInfo?(info: { version: string | null }): void;
  onAssistantText(text: string): void;
  onHook(payload: HookPayload): void;
  onPermission(request: RuntimePermissionRequest): Promise<RuntimePermissionResult>;
  onExit(outcome: RuntimeExit): void;
};

export type RuntimeChoice = { model?: string; effort?: string };
export type RuntimeStartInput = RuntimeChoice & { sessionId: string; cwd: string; purpose?: SessionPurposeKind; prompt: string; contextDir: string; permissionMode: PermissionMode; handlers: RuntimeHandlers };
export type RuntimeResumeInput = RuntimeChoice & { sessionId: string; claudeSessionId: string; cwd: string; purpose?: SessionPurposeKind; contextDir: string; permissionMode: PermissionMode; firstMessage: string; handlers: RuntimeHandlers };

export interface RuntimeHandle {
  push(text: string): void;
  interrupt(): Promise<void>;
  close(): Promise<void>;
  abandon(): Promise<void>;
}

export interface AgentSessionRuntime {
  start(input: RuntimeStartInput): RuntimeHandle;
  resume(input: RuntimeResumeInput): RuntimeHandle;
}

export type SessionRuntimes = Partial<Record<SessionAgent, AgentSessionRuntime>>;
