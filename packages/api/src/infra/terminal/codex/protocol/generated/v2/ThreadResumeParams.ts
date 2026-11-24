import type { AbsolutePathBuf } from "../AbsolutePathBuf";
import type { Personality } from "../Personality";
import type { ResponseItem } from "../ResponseItem";
import type { JsonValue } from "../serde_json/JsonValue";
import type { ApprovalsReviewer } from "./ApprovalsReviewer";
import type { AskForApproval } from "./AskForApproval";
import type { SandboxMode } from "./SandboxMode";
import type { ThreadResumeInitialTurnsPageParams } from "./ThreadResumeInitialTurnsPageParams";
export type ThreadResumeParams = { threadId: string,
history?: Array<ResponseItem> | null,
path?: string | null,
model?: string | null, modelProvider?: string | null, serviceTier?: string | null | null, cwd?: string | null,
runtimeWorkspaceRoots?: Array<AbsolutePathBuf> | null, approvalPolicy?: AskForApproval | null,
approvalsReviewer?: ApprovalsReviewer | null, sandbox?: SandboxMode | null,
permissions?: string | null, config?: { [key in string]?: JsonValue } | null, baseInstructions?: string | null, developerInstructions?: string | null,
personality?: Personality | null,
excludeTurns?: boolean,
initialTurnsPage?: ThreadResumeInitialTurnsPageParams | null, };
