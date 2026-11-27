import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import type { CodexCatalogProbe } from "../../../application/terminal/codexCatalogProbe";
import { modelUnavailableMessage } from "../../../application/terminal/sessionAgentCatalog";
import { CodexRpcClient } from "./codexRpcClient";
import { CODEX_QUESTION_TOOL_ENABLED } from "./codexThreadOptions";
import { logCodexProcess } from "./codexSessionControls";
import { openCodexThread, startCodexTurn } from "./codexSessionLaunch";
import type { CodexSessionRequestBridge } from "./codexSessionRequestBridge";
import { resumeCodexThread } from "./codexSessionResume";
import { startPromptHooks } from "./codexSessionStart";
import { isCodexSessionStopped, type CodexSessionDeps, type CodexSessionState } from "./codexSessionState";

type CatalogStatus = Awaited<ReturnType<CodexCatalogProbe["read"]>>;
export type CodexStartupListeners = { notification(method: string, params: unknown): void; exit(code: number | null, signal: NodeJS.Signals | null): void };
export type CodexStartupContext = { input: RuntimeStartInput; deps: CodexSessionDeps; state: CodexSessionState; requests: CodexSessionRequestBridge; listeners: CodexStartupListeners; resumeThreadId?: string };

export async function openCodexSession(context: CodexStartupContext) {
  const { input, deps, state } = context;
  const status = await deps.probe.read({ codexHome: input.credentialHome });
  if (isCodexSessionStopped(state)) return;
  state.version = status.version;
  input.handlers.onAgentInfo?.({ version: status.version });
  assertAvailable(status, input);
  await openProcess(context);
}

function assertAvailable(status: CatalogStatus, input: RuntimeStartInput) {
  if (!status.available) throw new Error(status.reason ?? "O Codex não está disponível.");
  const model = status.models.find((option) => option.id === input.model);
  if (!model) throw new Error(modelUnavailableMessage(input.model ?? ""));
  if (input.effort && !model.efforts.includes(input.effort)) throw new Error(`O esforço escolhido não está disponível para ${model.id}.`);
}

async function openProcess(context: CodexStartupContext) {
  const { input, deps, state, requests, listeners } = context;
  const child = await deps.process.start({ credentialHome: input.credentialHome });
  state.child = child;
  if (isCodexSessionStopped(state)) {
    await deps.process.terminate(child);
    state.child = null;
    return;
  }
  logCodexProcess(deps.log, { event: "codex_app_server_started", sessionId: input.sessionId, version: state.version, pid: child.pid ?? null });
  child.once("exit", listeners.exit);
  const rpc = new CodexRpcClient(child);
  state.rpc = rpc;
  state.unsubscribe.push(rpc.onNotification(listeners.notification), rpc.onServerRequest((request) => requests.answer(request.method, request.params)));
  await openThreadAndTurn(context, rpc);
}

async function openThreadAndTurn(context: CodexStartupContext, rpc: CodexRpcClient) {
  const { input, deps, state, resumeThreadId } = context;
  const threadId = resumeThreadId ? await resumeCodexThread(rpc, input, { threadId: resumeThreadId, requestUserInput: deps.requestUserInput }) : await openCodexThread(rpc, input, deps.requestUserInput);
  state.threadId = threadId;
  if (isCodexSessionStopped(state)) return;
  for (const hook of startPromptHooks(threadId, input, resumeThreadId ? "resume" : "startup")) input.handlers.onHook(hook);
  state.turnId = await startCodexTurn(rpc, input, threadId);
  if (isCodexSessionStopped(state)) return;
  state.startedTurn = true;
  deps.log.info("codex_turn_started", { sessionId: input.sessionId, threadId, version: state.version, pid: state.child?.pid ?? null, requestUserInput: deps.requestUserInput ?? CODEX_QUESTION_TOOL_ENABLED });
}
