import type { AbsolutePathBuf } from "../AbsolutePathBuf";
import type { CollaborationMode } from "../CollaborationMode";
import type { LegacyAppPathString } from "../LegacyAppPathString";
import type { MultiAgentMode } from "../MultiAgentMode";
import type { ReasoningEffort } from "../ReasoningEffort";
import type { ActivePermissionProfile } from "./ActivePermissionProfile";
import type { ApprovalsReviewer } from "./ApprovalsReviewer";
import type { AskForApproval } from "./AskForApproval";
import type { SandboxPolicy } from "./SandboxPolicy";
import type { Thread } from "./Thread";
import type { TurnsPage } from "./TurnsPage";
export type ThreadResumeResponse = { thread: Thread, model: string, modelProvider: string, serviceTier: string | null,
disabledPluginIds: Array<string>, cwd: AbsolutePathBuf,
runtimeWorkspaceRoots: Array<AbsolutePathBuf>,
instructionSources: Array<LegacyAppPathString>, approvalPolicy: AskForApproval,
approvalsReviewer: ApprovalsReviewer,
sandbox: SandboxPolicy,
activePermissionProfile: ActivePermissionProfile | null, reasoningEffort: ReasoningEffort | null,
collaborationMode: CollaborationMode | null,
multiAgentMode: MultiAgentMode,
initialTurnsPage: TurnsPage | null,
turnsBackwardsCursor: string | null,
itemsBackwardsCursor: string | null, };
