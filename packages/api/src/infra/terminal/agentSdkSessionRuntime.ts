import type { AgentSessionRuntime, RuntimeResumeInput, RuntimeStartInput } from "../../application/terminal/agentSessionRuntime";
import { CLAUDE_BINARY } from "../../application/terminal/toolLocator";
import type { SessionLog } from "../../application/services/terminal/sessionLog";
import type { PathToolLocator } from "./pathToolLocator";
import { AgentSdkSession } from "./agentSdkSession";

export type AgentSdkRuntimeDeps = { locator: Pick<PathToolLocator, "locate">; env: NodeJS.ProcessEnv; log: SessionLog };

export class AgentSdkSessionRuntime implements AgentSessionRuntime {
  constructor(private readonly deps: AgentSdkRuntimeDeps) {}

  start(input: RuntimeStartInput) {
    const { sessionId, cwd, contextDir, permissionMode, handlers, model, effort } = input;
    return new AgentSdkSession({ sessionId, cwd, contextDir, permissionMode, handlers, model, effort, firstMessage: input.prompt }, this.sessionDeps());
  }

  resume(input: RuntimeResumeInput) {
    const { sessionId, cwd, contextDir, permissionMode, handlers, model, effort } = input;
    return new AgentSdkSession({ sessionId, cwd, contextDir, permissionMode, handlers, model, effort, firstMessage: input.firstMessage, resumeId: input.claudeSessionId }, this.sessionDeps());
  }

  private sessionDeps() {
    return { locate: () => this.deps.locator.locate(CLAUDE_BINARY), env: this.deps.env, log: this.deps.log };
  }
}
