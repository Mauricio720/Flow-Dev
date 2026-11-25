import type { AgentSessionRuntime, RuntimeResumeInput, RuntimeStartInput } from "../../application/terminal/agentSessionRuntime";
import type { SessionPurposeKind } from "../../application/terminal/sessionPurposeKind";
import { ScriptedSessionRunner } from "./scriptedSessionRunner";
import { stepsOf, type ScriptSource } from "./scriptedSessionSteps";

export type ScriptedRuntimeOptions = { script?: ScriptSource; resumeScript?: ScriptSource; resumeFailure?: Error; claudeSessionIdFor?: (sessionId: string) => string };

const defaultClaudeSessionId = (sessionId: string) => `claude-${sessionId}`;

export class ScriptedSessionRuntime implements AgentSessionRuntime {
  readonly starts: RuntimeStartInput[] = [];
  readonly resumes: RuntimeResumeInput[] = [];
  readonly runners = new Map<string, ScriptedSessionRunner>();

  constructor(private readonly options: ScriptedRuntimeOptions = {}) {}

  start(input: RuntimeStartInput) {
    this.starts.push(input);
    const claudeSessionId = (this.options.claudeSessionIdFor ?? defaultClaudeSessionId)(input.sessionId);
    const config = { claudeSessionId, cwd: input.cwd, handlers: input.handlers, steps: stepsOf(this.options.script, scriptContext(input)), source: "startup" as const, firstMessage: input.prompt };
    return this.register(input.sessionId, new ScriptedSessionRunner(config));
  }

  resume(input: RuntimeResumeInput) {
    this.resumes.push(input);
    if (this.options.resumeFailure) throw this.options.resumeFailure;
    const config = { claudeSessionId: input.claudeSessionId, cwd: input.cwd, handlers: input.handlers, steps: stepsOf(this.options.resumeScript, scriptContext(input)), source: "resume" as const, firstMessage: input.firstMessage };
    return this.register(input.sessionId, new ScriptedSessionRunner(config));
  }

  runnerOf(sessionId: string) {
    const runner = this.runners.get(sessionId);
    if (!runner) throw new Error(`Nenhuma sessão roteirizada para ${sessionId}`);
    return runner;
  }

  private register(sessionId: string, runner: ScriptedSessionRunner) {
    this.runners.set(sessionId, runner);
    return runner;
  }
}

function scriptContext(input: { sessionId: string; cwd: string; purpose?: SessionPurposeKind }) {
  return { sessionId: input.sessionId, cwd: input.cwd, purpose: input.purpose ?? "route" };
}
