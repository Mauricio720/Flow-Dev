import type { PermissionMode } from "./sessionInteraction";

export type HookPayload = Record<string, unknown>;
export type RuntimePermissionRequest = { toolName: string; input: Record<string, unknown>; toolUseId: string; suggestions: unknown[] };
export type RuntimePermissionResult =
  | { behavior: "allow"; updatedInput?: Record<string, unknown>; updatedPermissions?: unknown[] }
  | { behavior: "deny"; message: string };
export type RuntimeExit = { kind: "ended" | "crashed" | "failed"; detail?: string };

export type RuntimeHandlers = {
  onAssistantText(text: string): void;
  onHook(payload: HookPayload): void;
  onPermission(request: RuntimePermissionRequest): Promise<RuntimePermissionResult>;
  onExit(outcome: RuntimeExit): void;
};

export type RuntimeStartInput = { sessionId: string; cwd: string; prompt: string; contextDir: string; permissionMode: PermissionMode; handlers: RuntimeHandlers };
export type RuntimeResumeInput = { sessionId: string; claudeSessionId: string; cwd: string; contextDir: string; permissionMode: PermissionMode; firstMessage: string; handlers: RuntimeHandlers };

export interface RuntimeHandle {
  push(text: string): void;
  interrupt(): Promise<void>;
  close(): Promise<void>;
  abandon(): Promise<void>;
}

export interface ClaudeSessionRuntime {
  start(input: RuntimeStartInput): RuntimeHandle;
  resume(input: RuntimeResumeInput): RuntimeHandle;
}
