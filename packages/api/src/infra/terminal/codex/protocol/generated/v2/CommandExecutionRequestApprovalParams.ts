import type { LegacyAppPathString } from "../LegacyAppPathString";
import type { AdditionalPermissionProfile } from "./AdditionalPermissionProfile";
import type { CommandAction } from "./CommandAction";
import type { CommandExecutionApprovalDecision } from "./CommandExecutionApprovalDecision";
import type { CommandExecutionApprovalKind } from "./CommandExecutionApprovalKind";
import type { ExecPolicyAmendment } from "./ExecPolicyAmendment";
import type { NetworkApprovalContext } from "./NetworkApprovalContext";
import type { NetworkPolicyAmendment } from "./NetworkPolicyAmendment";
export type CommandExecutionRequestApprovalParams = {
kind: CommandExecutionApprovalKind, threadId: string, turnId: string, itemId: string,
startedAtMs: number,
approvalId?: string | null,
environmentId: string | null,
reason?: string | null,
networkApprovalContext?: NetworkApprovalContext | null,
command?: string | null,
cwd?: LegacyAppPathString | null,
commandActions?: Array<CommandAction> | null,
additionalPermissions?: AdditionalPermissionProfile | null,
proposedExecpolicyAmendment?: ExecPolicyAmendment | null,
proposedNetworkPolicyAmendments?: Array<NetworkPolicyAmendment> | null,
availableDecisions?: Array<CommandExecutionApprovalDecision> | null, };
