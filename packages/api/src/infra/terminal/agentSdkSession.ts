import { query, type CanUseTool, type PermissionResult, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { RuntimeExit, RuntimeHandle, RuntimeHandlers } from "../../application/terminal/agentSessionRuntime";
import type { PermissionMode } from "../../application/terminal/sessionInteraction";
import { errorFields, type SessionLog } from "../../application/services/terminal/sessionLog";
import { UserMessageQueue } from "./agentSdkMessageStream";
import { buildHooks } from "./agentSdkHooks";
import { agentSdkExit } from "./agentSdkExit";
import { AgentInfoReporter } from "./agentSdkInfoReporter";
import { assistantTextOf, initSessionId, launchBlockingText } from "./agentSdkMessages";
import { buildQueryOptions } from "./agentSdkQueryOptions";
import { StderrTail } from "./agentSdkStderrTail";
import { sessionEndHook, sessionStartHook } from "./syntheticHooks";

export type AgentSdkSetup = { sessionId: string; cwd: string; contextDir: string; permissionMode: PermissionMode; handlers: RuntimeHandlers; firstMessage: string; resumeId?: string; model?: string; effort?: string; credentialHome?: string };
export type AgentSdkDeps = { locate: () => Promise<string | null>; env: NodeJS.ProcessEnv; log: SessionLog };

export class AgentSdkSession implements RuntimeHandle {
  private readonly queue = new UserMessageQueue();
  private current: Query | null = null;
  private claudeSessionId: string | null = null;
  private closing = false;
  private exited = false;
  private spoke = false;
  private readonly agentInfo = new AgentInfoReporter((info) => this.setup.handlers.onAgentInfo?.(info));
  private readonly stderrTail = new StderrTail();
  private readonly finished: Promise<void>;

  constructor(private readonly setup: AgentSdkSetup, private readonly deps: AgentSdkDeps) {
    this.queue.push(setup.firstMessage);
    this.finished = this.run();
  }

  push(text: string) {
    this.queue.push(text);
  }

  async interrupt() {
    await this.current?.interrupt();
  }

  async close() {
    this.closing = true;
    this.queue.close();
    this.current?.close();
    await this.finished;
  }

  async abandon() {
    this.exited = true;
    await this.close();
  }

  private async run() {
    try {
      const claudePath = await this.deps.locate();
      if (!claudePath) throw new Error("Claude Code não encontrado no PATH");
      const { setup } = this;
      const options = buildQueryOptions({ cwd: setup.cwd, contextDir: setup.contextDir, permissionMode: setup.permissionMode, claudePath, env: this.deps.env, canUseTool: this.canUseTool, hooks: buildHooks((payload) => setup.handlers.onHook(payload)), resumeId: setup.resumeId, model: setup.model, effort: setup.effort, credentialHome: setup.credentialHome, stderr: (data) => this.stderrTail.remember(data) });
      this.current = query({ prompt: this.queue, options });
      for await (const message of this.current) this.handle(message);
      this.finish(this.closing ? { kind: "ended" } : { kind: "crashed", detail: "O Claude Code encerrou sem pedido" });
    } catch (error) {
      this.deps.log.error("sdk_error", { sessionId: this.setup.sessionId, ...errorFields(error) });
      this.finish(agentSdkExit({ error, closing: this.closing, started: this.claudeSessionId !== null, stderr: this.stderrTail.text() }));
    }
  }

  private handle(message: Parameters<typeof initSessionId>[0]) {
    const id = initSessionId(message);
    this.agentInfo.observe(message);
    if (id && this.claudeSessionId === null) this.announceStart(id);
    const blocked = launchBlockingText(message);
    if (blocked !== null && !this.spoke) return this.abort({ kind: "failed", detail: blocked });
    const text = assistantTextOf(message);
    if (text === null) return;
    this.spoke = true;
    this.setup.handlers.onAssistantText(text);
  }

  private announceStart(claudeSessionId: string) {
    this.claudeSessionId = claudeSessionId;
    this.setup.handlers.onHook(sessionStartHook({ claudeSessionId, cwd: this.setup.cwd, source: this.setup.resumeId ? "resume" : "startup" }));
  }

  private abort(outcome: RuntimeExit) {
    this.finish(outcome);
    void this.close();
  }

  private readonly canUseTool: CanUseTool = async (toolName, input, options) => (await this.setup.handlers.onPermission({ toolName, input, toolUseId: options.toolUseID, suggestions: options.suggestions ?? [] })) as PermissionResult;

  private finish(outcome: RuntimeExit) {
    if (this.exited) return;
    this.exited = true;
    if (outcome.kind === "ended" && this.claudeSessionId) this.setup.handlers.onHook(sessionEndHook(this.claudeSessionId));
    this.setup.handlers.onExit(outcome);
  }
}
