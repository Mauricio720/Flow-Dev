import type { ApprovedPlanning, TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import { LAUNCH_FAILED_KIND } from "./terminalErrorCatalog";
import type { TerminalLog } from "./terminalLaunchLog";
import { appendAttachmentsSection } from "./terminalPromptBuilder";
import type { AttachmentPlan, SessionAttachmentDelivery } from "./sessionAttachmentDelivery";

export type PrepareStepDeps = { sessions: TerminalSessionDao; context: SessionContextBuilder; delivery: SessionAttachmentDelivery; log: TerminalLog };

export function promptSource(planning: ApprovedPlanning) {
  return { route: planning.route, issueNumber: planning.issue.number, title: planning.issue.title, url: planning.issue.url, body: planning.issue.body, complexity: planning.complexity, reasons: planning.reasons, uncertainties: planning.uncertainties };
}

export function openedResult(session: TerminalSessionRecord, unavailableIssueImages = 0) {
  return { sessionId: session.id, unavailableIssueImages };
}

export class SessionPrepareStep {
  constructor(private readonly deps: PrepareStepDeps) {}

  async run(session: TerminalSessionRecord, prompt: string, plan: AttachmentPlan) {
    try {
      const paths = await this.deps.context.prepare(session.id);
      const delivered = await this.deps.delivery.deliver(plan, { userId: session.userId, taskId: session.taskId, attachmentsDir: paths.attachmentsDir });
      await this.deps.context.writePrompt(session.id, appendAttachmentsSection(prompt, delivered));
      await this.deps.sessions.markPrepared(session.id, new Date());
    } catch (error) {
      await this.fail(session, error);
    }
    await this.deps.delivery.finish(plan, session.userId).catch(() => undefined);
  }

  private async fail(session: TerminalSessionRecord, error: unknown): Promise<never> {
    const reason = error instanceof Error ? error.message : "unknown";
    await this.deps.context.discard(session.id).catch(() => undefined);
    await this.deps.sessions.markLaunchFailed(session.id, reason);
    this.deps.log.launchFailed({ sessionId: session.id, taskId: session.taskId, reason, kind: LAUNCH_FAILED_KIND });
    throw error;
  }
}
