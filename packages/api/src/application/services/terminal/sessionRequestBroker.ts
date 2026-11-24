import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { RuntimePermissionRequest, RuntimePermissionResult } from "../../terminal/agentSessionRuntime";
import type { PermissionPayload, QuestionPayload } from "../../terminal/sessionInteraction";
import type { SessionRequestDao, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import { denyResult } from "./answerMapper";
import { suggestedRuleOf } from "./permissionRuleText";
import { summarizePermissionRequest } from "./permissionRequestSummarizer";
import type { InflightTracker } from "./inflightTracker";
import type { PendingRequestRegistry } from "./pendingRequestRegistry";
import { errorFields, type SessionLog } from "./sessionLog";
import type { SessionPermissions } from "./sessionPermissions";
import type { SessionRequestGate } from "./sessionRequestGate";

export const QUESTION_TOOL = "AskUserQuestion";
export const REGISTER_FAILED_MESSAGE = "Não foi possível registrar o pedido.";

export type BrokerDeps = { requests: SessionRequestDao; status: Pick<SessionStatusDao, "transition">; registry: PendingRequestRegistry; tracker: InflightTracker; gate: SessionRequestGate; log: SessionLog };

export class SessionRequestBroker implements SessionPermissions {
  constructor(private readonly deps: BrokerDeps) {}

  async handle(session: TerminalSessionRecord, request: RuntimePermissionRequest): Promise<RuntimePermissionResult> {
    if (session.permissionMode === "bypass" && request.toolName !== QUESTION_TOOL) return { behavior: "allow", updatedInput: request.input };
    try {
      const { pending } = await this.deps.tracker.track(this.deps.gate.run(session.id, async () => {
        const stored = await this.open(session, request);
        let resolve!: (result: RuntimePermissionResult) => void;
        const pending = new Promise<RuntimePermissionResult>((finish) => { resolve = finish; });
        this.deps.registry.add(stored.id, { sessionId: session.id, input: request.input, resolve });
        return { pending };
      }));
      return await pending;
    } catch (error) {
      this.deps.log.error("request_failed", { sessionId: session.id, tool: request.toolName, ...errorFields(error) });
      return denyResult(REGISTER_FAILED_MESSAGE);
    }
  }

  private async open(session: TerminalSessionRecord, request: RuntimePermissionRequest): Promise<SessionRequestRecord> {
    const isQuestion = request.toolName === QUESTION_TOOL;
    const payload = isQuestion ? questionPayload(request) : permissionPayload(session, request);
    const kind = isQuestion ? "question" : request.permissionKind === "command" ? "permission" : request.permissionKind ?? "permission";
    const stored = await this.deps.requests.insertRequest({ sessionId: session.id, kind, toolUseId: request.toolUseId, payload });
    await this.deps.status.transition(session.id, "request_opened");
    this.deps.log.info("request_opened", { sessionId: session.id, kind: stored.kind, tool: request.toolName });
    return stored;
  }
}

function questionPayload(request: RuntimePermissionRequest): QuestionPayload {
  return { questions: (request.input.questions ?? []) as QuestionPayload["questions"] };
}

function permissionPayload(session: TerminalSessionRecord, request: RuntimePermissionRequest): PermissionPayload {
  const summary = summarizePermissionRequest({ toolName: request.toolName, input: request.input, cwd: session.checkoutPath });
  return { toolName: request.toolName, permissionKind: request.permissionKind ?? "command", ...summary, suggestedRule: suggestedRuleOf(request.suggestions), suggestions: request.suggestions, offers: request.offers ?? ["allow", "allow_always", "deny"], alwaysScope: request.alwaysScope ?? "project" };
}
