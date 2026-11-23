import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimePermissionRequest, RuntimePermissionResult } from "../../terminal/claudeSessionRuntime";

export interface SessionPermissions {
  handle(session: TerminalSessionRecord, request: RuntimePermissionRequest): Promise<RuntimePermissionResult>;
}
