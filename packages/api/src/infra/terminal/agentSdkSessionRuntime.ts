import type { ClaudeSessionRuntime, RuntimeResumeInput, RuntimeStartInput } from "../../application/terminal/claudeSessionRuntime";
import { CLAUDE_BINARY } from "../../application/terminal/toolLocator";
import type { SessionLog } from "../../application/services/terminal/sessionLog";
import type { PathToolLocator } from "./pathToolLocator";
import { AgentSdkSession } from "./agentSdkSession";

export type AgentSdkRuntimeDeps = { locator: Pick<PathToolLocator, "locate">; env: NodeJS.ProcessEnv; log: SessionLog };

export class AgentSdkSessionRuntime implements ClaudeSessionRuntime {
  constructor(private readonly deps: AgentSdkRuntimeDeps) {}

  start(input: RuntimeStartInput) {
    const { sessionId, cwd, contextDir, permissionMode, handlers } = input;
    return new AgentSdkSession({ sessionId, cwd, contextDir, permissionMode, handlers, firstMessage: input.prompt }, this.sessionDeps());
  }

  resume(input: RuntimeResumeInput) {
    const { sessionId, cwd, contextDir, permissionMode, handlers } = input;
    return new AgentSdkSession({ sessionId, cwd, contextDir, permissionMode, handlers, firstMessage: input.firstMessage, resumeId: input.claudeSessionId }, this.sessionDeps());
  }

  private sessionDeps() {
    return { locate: () => this.deps.locator.locate(CLAUDE_BINARY), env: this.deps.env, log: this.deps.log };
  }
}
