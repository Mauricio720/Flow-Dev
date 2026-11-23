import type { ApprovedPlanning, TerminalSessionDao, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import type { SessionSettingsWriter } from "../../terminal/sessionSettings";
import type { TerminalCommand, TerminalLauncher } from "../../terminal/terminalLauncher";
import { TaskError } from "../tasks/taskErrors";
import { createSessionToken, hashSessionToken } from "./sessionToken";
import { LAUNCH_FAILED_KIND } from "./terminalErrorCatalog";
import type { TerminalLog } from "./terminalLaunchLog";
import { appendAttachmentsSection } from "./terminalPromptBuilder";
import type { AttachmentPlan, SessionAttachmentDelivery } from "./sessionAttachmentDelivery";

export type CommandBuilder = (input: { checkoutPath: string; contextDir: string; settingsPath: string; prompt: string }) => TerminalCommand;
export type LaunchStepDeps = { sessions: TerminalSessionDao; context: SessionContextBuilder; settings: SessionSettingsWriter; launcher: TerminalLauncher; buildCommand: CommandBuilder; delivery: SessionAttachmentDelivery; log: TerminalLog };

export function promptSource(planning: ApprovedPlanning) {
  return { route: planning.route, issueNumber: planning.issue.number, title: planning.issue.title, url: planning.issue.url, body: planning.issue.body, complexity: planning.complexity, reasons: planning.reasons, uncertainties: planning.uncertainties };
}

export function openedResult(session: TerminalSessionRecord, unavailableIssueImages = 0) {
  return { sessionId: session.id, unavailableIssueImages };
}

export class TerminalLaunchStep {
  constructor(private readonly deps: LaunchStepDeps) {}

  async run(session: TerminalSessionRecord, prompt: string, plan: AttachmentPlan) {
    try {
      const paths = await this.deps.context.prepare(session.id);
      const delivered = await this.deps.delivery.deliver(plan, { userId: session.userId, taskId: session.taskId, attachmentsDir: paths.attachmentsDir });
      const finalPrompt = appendAttachmentsSection(prompt, delivered);
      const settingsPath = await this.prepareSettings(session.id, paths.sessionDir);
      await this.deps.launcher.launch(this.deps.buildCommand({ checkoutPath: session.checkoutPath, contextDir: paths.contextDir, settingsPath, prompt: finalPrompt }));
    } catch (error) {
      await this.fail(session, error);
    }
    await this.deps.delivery.finish(plan, session.userId).catch(() => undefined);
  }

  private async prepareSettings(sessionId: string, sessionDir: string) {
    const token = createSessionToken();
    await this.deps.sessions.setTokenHash(sessionId, hashSessionToken(token));
    return this.deps.settings.write({ sessionDir, token });
  }

  private async fail(session: TerminalSessionRecord, error: unknown): Promise<never> {
    const reason = error instanceof Error ? error.message : "unknown";
    await this.deps.context.discard(session.id).catch(() => undefined);
    await this.deps.sessions.markLaunchFailed(session.id, reason);
    this.deps.log.launchFailed({ sessionId: session.id, taskId: session.taskId, reason });
    throw new TaskError("terminal_unavailable", { kind: LAUNCH_FAILED_KIND }, error);
  }
}
