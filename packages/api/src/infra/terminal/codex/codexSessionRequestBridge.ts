import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import type { SessionLog } from "../../../application/services/terminal/sessionLog";
import { logCodexRequest } from "./codexSessionControls";
import { answerCodexRequest } from "./codexSessionRequests";
import type { FileChangeApprovalRequest, ItemStartedParams } from "./protocol/codexMethods";
import type { FileUpdateChange } from "./protocol/generated/v2/FileUpdateChange";

const ITEM_STARTED_METHOD = "item/started";
const ITEM_COMPLETED_METHOD = "item/completed";
const FILE_CHANGE_ITEM = "fileChange";
const FILE_CHANGE_APPROVAL_METHOD = "item/fileChange/requestApproval";

export class CodexSessionRequestBridge {
  private readonly fileChanges = new Map<string, FileUpdateChange[]>();

  constructor(private readonly input: RuntimeStartInput, private readonly log: SessionLog, private readonly onDenied: (message: string) => void) {}

  track(method: string, params: ItemStartedParams) {
    const item = params.item;
    if (item?.type !== FILE_CHANGE_ITEM) return;
    if (method === ITEM_STARTED_METHOD) this.fileChanges.set(item.id, item.changes);
    if (method === ITEM_COMPLETED_METHOD) this.fileChanges.delete(item.id);
  }

  answer(method: string, params: unknown) {
    logCodexRequest(this.log, this.input.sessionId, method);
    return answerCodexRequest({ input: this.input, method, params: this.withChanges(method, params), onDenied: this.onDenied });
  }

  private withChanges(method: string, params: unknown) {
    if (method !== FILE_CHANGE_APPROVAL_METHOD || !params || typeof params !== "object") return params;
    const request = params as FileChangeApprovalRequest;
    return { ...request, changes: this.fileChanges.get(request.itemId) ?? [] };
  }
}
