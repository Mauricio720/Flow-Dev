import type { ProjectRecord } from "../application/database/dao/projectDao";
import type { ApprovedPlanning, TerminalSessionDao } from "../application/database/dao/terminalSessionDao";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { VerifiedCheckout } from "../application/services/projects/localCheckoutService";
import type { IssueImageSelector } from "../application/services/terminal/issueImageSelector";
import type { AttachmentPlan } from "../application/services/terminal/sessionAttachmentDelivery";
import type { SessionAttachmentDelivery } from "../application/services/terminal/sessionAttachmentDelivery";
import type { SessionPurposeResolver } from "../application/services/terminal/sessionPurpose";
import type { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import type { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import type { SessionLauncher } from "../application/services/terminal/sessionLauncher";
import type { PermissionMode } from "../application/terminal/sessionInteraction";
import type { OpenPurpose, PreviewPurpose, ResolvedPurpose } from "../application/terminal/sessionPurposeInput";
import type { SessionPrincipal } from "../context";

export type Scope = { projectId: string; taskId: string };
export type PreflightInput = Scope & { purpose: PreviewPurpose };
export type OpenInput = Scope & { prompt: string; requestKey: string; attachmentIds: string[]; issueImageIds: string[]; allowAdditional: boolean; permissionMode: PermissionMode; purpose: OpenPurpose };
export type OpenRequest = { actor: SessionPrincipal; input: OpenInput; planning: ApprovedPlanning; checkout: VerifiedCheckout; plan: AttachmentPlan; resolved: ResolvedPurpose };

export type TerminalControllerDeps = {
  authorization: Pick<WorkAuthorization, "requireOperate">;
  sessions: TerminalSessionDao;
  projects: { findById(projectId: string): Promise<ProjectRecord | null> };
  guard: TerminalOpenGuard;
  issueImages: Pick<IssueImageSelector, "select">;
  delivery: SessionAttachmentDelivery;
  cleanup: Pick<TerminalAttachmentService, "cleanup">;
  purposes: Pick<SessionPurposeResolver, "preview" | "resolve" | "confirm">;
  launcher: Pick<SessionLauncher, "startManual">;
};
