import type { AgentSessionRuntime, RuntimeResumeInput, RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import type { CodexSessionDeps } from "./codexSession";
import { CodexSession } from "./codexSession";

export class CodexAppServerRuntime implements AgentSessionRuntime {
  constructor(private readonly deps: CodexSessionDeps) {}
  start(input: RuntimeStartInput) { return new CodexSession(input, this.deps); }
  resume(input: RuntimeResumeInput) { return new CodexSession({ ...input, prompt: input.firstMessage }, this.deps, input.claudeSessionId); }
}
