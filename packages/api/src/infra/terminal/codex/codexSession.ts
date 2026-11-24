import type { RuntimeHandle, RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { interruptCodexTurn, stopCodexProcess, unsubscribeCodexThread } from "./codexSessionControls";
import { handleCodexNotification } from "./codexSessionEvents";
import { detachCodexSession, failCodexSession, finishCodexSession, handleCodexProcessExit, type CodexExitContext } from "./codexSessionExit";
import { CodexSessionRequestBridge } from "./codexSessionRequestBridge";
import { openCodexSession, type CodexStartupContext } from "./codexSessionStartup";
import { createCodexSessionState, isCodexSessionStopped, type CodexSessionDeps } from "./codexSessionState";
import { CodexTurnQueue } from "./codexTurnQueue";
import { sendCodexTurn, withDenialNote } from "./codexTurnDispatch";
import { sessionEndHook } from "../syntheticHooks";
import type { ItemStartedParams, ThreadNotification } from "./protocol/codexMethods";

export type { CodexSessionDeps } from "./codexSessionState";

export class CodexSession implements RuntimeHandle {
  private readonly state = createCodexSessionState();
  private readonly turns = new CodexTurnQueue();
  private readonly requests: CodexSessionRequestBridge;
  private readonly startup: Promise<void>;
  private denialNote: string | null = null;

  constructor(private readonly input: RuntimeStartInput, private readonly deps: CodexSessionDeps, private readonly resumeThreadId?: string) {
    this.requests = new CodexSessionRequestBridge(input, deps.log, (message) => { this.denialNote = message; });
    this.startup = this.start();
  }

  push(text: string) {
    const next = this.turns.enqueue(text);
    if (next) void this.sendTurn(next);
  }

  async interrupt() {
    await interruptCodexTurn(this.state.rpc, this.state.threadId, this.state.turnId);
  }

  async close() {
    this.state.closing = true;
    await this.shutdown();
    await this.startup;
    if (this.state.threadId) this.input.handlers.onHook(sessionEndHook(this.state.threadId));
    finishCodexSession(this.exitContext, { kind: "ended" });
  }

  async abandon() {
    this.state.abandoned = true;
    this.state.closing = true;
    await this.shutdown();
    await this.startup;
  }

  private async shutdown() {
    await unsubscribeCodexThread(this.state.rpc, this.state.threadId);
    await stopCodexProcess(this.deps.process, this.state.child, () => detachCodexSession(this.state));
  }

  private async start() {
    try { await openCodexSession(this.startupContext()); }
    catch (error) { if (!isCodexSessionStopped(this.state)) await failCodexSession(this.exitContext, error); }
  }

  private startupContext(): CodexStartupContext {
    const listeners = { notification: (method: string, params: unknown) => this.notification(method, params), exit: (code: number | null, signal: NodeJS.Signals | null) => handleCodexProcessExit(this.exitContext, { code, signal }) };
    return { input: this.input, deps: this.deps, state: this.state, requests: this.requests, listeners, resumeThreadId: this.resumeThreadId };
  }

  private notification(method: string, params: unknown) {
    const { threadId } = this.state;
    if (!threadId) return;
    this.requests.track(method, params as ItemStartedParams);
    handleCodexNotification({ input: this.input, method, params: params as ThreadNotification, threadId, turns: this.turns, sendTurn: (prompt) => void this.sendTurn(prompt) });
  }

  private async sendTurn(prompt: string) {
    const { rpc, threadId } = this.state;
    if (!rpc || !threadId) return;
    const note = this.denialNote;
    this.denialNote = null;
    try { this.state.turnId = await sendCodexTurn({ input: this.input, rpc, threadId, prompt: withDenialNote(prompt, note) }); }
    catch (error) { this.turns.fail(); await failCodexSession(this.exitContext, error); }
  }

  private get exitContext(): CodexExitContext {
    return { input: this.input, deps: this.deps, state: this.state };
  }
}
