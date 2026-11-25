import type { RuntimeHandle, RuntimePermissionResult } from "../../application/terminal/agentSessionRuntime";
import { pollUntil } from "./scriptedSettle";
import { contentStep, isRequestStep } from "./scriptedStepContent";
import type { ScriptStep } from "./scriptedSessionSteps";
import type { RunnerConfig } from "./scriptedRunnerConfig";
import { sessionEndHook, sessionHook, sessionStartHook } from "./syntheticHooks";

export class ScriptedSessionRunner implements RuntimeHandle {
  readonly received: string[] = [];
  readonly outcomes: RuntimePermissionResult[] = [];
  interrupts = 0;
  closed = false;
  blocked = false;
  private wake: (() => void) | null = null;
  private buffered: string[] = [];
  private skipping = false;

  constructor(private readonly config: RunnerConfig) {
    queueMicrotask(() => void this.run().catch((error: Error) => this.exit({ kind: "failed", detail: error.message })));
  }

  push(text: string) {
    this.received.push(text);
    this.buffered.push(text);
    this.config.handlers.onHook(sessionHook(this.config, { hook_event_name: "UserPromptSubmit", prompt: text }));
    this.wake?.();
  }

  async interrupt() {
    this.interrupts += 1;
    this.skipping = true;
  }

  async close() {
    if (this.closed) return;
    await this.abandon();
    this.config.handlers.onHook(sessionEndHook(this.config.claudeSessionId));
    this.config.handlers.onExit({ kind: "ended" });
  }

  async abandon() {
    this.closed = true;
    this.wake?.();
  }

  async settled() {
    await pollUntil(() => this.blocked || this.closed);
  }

  private async run() {
    const { handlers, claudeSessionId, cwd, source, steps, firstMessage } = this.config;
    if (steps[0]?.kind === "fail") return void this.exit({ kind: "failed", detail: steps[0].detail });
    handlers.onHook(sessionStartHook({ claudeSessionId, cwd, source }));
    this.push(firstMessage);
    this.buffered.shift();
    for (const step of steps) if (!this.closed && await this.execute(step) === "stop") return;
    while (!this.closed) await this.block();
  }

  private block() {
    this.blocked = true;
    return new Promise<void>((resolve) => { this.wake = () => { this.blocked = false; this.wake = null; resolve(); }; });
  }

  private async execute(step: ScriptStep): Promise<"go" | "stop"> {
    if (this.skipping && step.kind !== "wait_message") return "go";
    switch (step.kind) {
      case "fail": return this.exit({ kind: "failed", detail: step.detail });
      case "crash": return this.exit({ kind: "crashed" });
      case "wait_message": await this.waitMessage(); break;
      case "end_turn": this.config.handlers.onHook(sessionHook(this.config, { hook_event_name: "Stop" })); break;
      case "hook": this.config.handlers.onHook(step.payload); break;
      default: await this.speakOrAsk(step);
    }
    return "go";
  }

  private async speakOrAsk(step: ScriptStep) {
    const pending = contentStep(step, this.config, `toolu_${this.outcomes.length + 1}`);
    const outcome = await (isRequestStep(step) ? this.hold(pending) : pending);
    if (outcome) this.outcomes.push(outcome);
  }

  private hold<T>(pending: Promise<T>) {
    this.blocked = true;
    return pending.finally(() => { this.blocked = false; });
  }

  private async waitMessage() {
    this.skipping = false;
    while (this.buffered.length === 0 && !this.closed) await this.block();
    this.buffered.shift();
  }

  private exit(outcome: { kind: "failed" | "crashed"; detail?: string }): "stop" {
    this.closed = true;
    this.config.handlers.onExit(outcome);
    return "stop";
  }
}
