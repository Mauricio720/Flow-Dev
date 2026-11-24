import type { AbsolutePathBuf } from "../AbsolutePathBuf";
import type { LegacyAppPathString } from "../LegacyAppPathString";
import type { MultiAgentMode } from "../MultiAgentMode";
import type { ReasoningEffort } from "../ReasoningEffort";
import type { ActivePermissionProfile } from "./ActivePermissionProfile";
import type { ApprovalsReviewer } from "./ApprovalsReviewer";
import type { AskForApproval } from "./AskForApproval";
import type { SandboxPolicy } from "./SandboxPolicy";
import type { Thread } from "./Thread";
export type ThreadStartResponse = { thread: Thread, model: string, modelProvider: string, serviceTier: string | null,
disabledPluginIds: Array<string>, cwd: AbsolutePathBuf,
runtimeWorkspaceRoots: Array<AbsolutePathBuf>,
instructionSources: Array<LegacyAppPathString>, approvalPolicy: AskForApproval,
approvalsReviewer: ApprovalsReviewer,
sandbox: SandboxPolicy,
activePermissionProfile: ActivePermissionProfile | null, reasoningEffort: ReasoningEffort | null,
multiAgentMode: MultiAgentMode, };
