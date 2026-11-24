import type { LegacyAppPathString } from "../LegacyAppPathString";
import type { RequestPermissionProfile } from "./RequestPermissionProfile";
export type PermissionsRequestApprovalParams = { threadId: string, turnId: string, itemId: string, environmentId: string | null,
startedAtMs: number, cwd: LegacyAppPathString, reason: string | null, permissions: RequestPermissionProfile, };
