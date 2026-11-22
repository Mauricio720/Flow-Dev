import { spawn, type ChildProcess } from "node:child_process";
import { AgentRunError } from "../../application/agents/localAgentRunner";
import { killGroup } from "./processGroup";

export const MAX_OUTPUT_BYTES = 256 * 1024;
const COMPLETION_GRACE_MS = 1500;

export type ProcessSpec = {
  label: string;
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd: string;
  stdin: string;
  timeoutMs: number;
  signal: AbortSignal;
  isComplete?: (stdout: string) => boolean;
  graceMs?: number;
};

export type ProcessResult = { stdout: string; stderr: string; exitCode: number | null };

class ProcessRun {
  private stdout = "";
  private stderr = "";
  private bytes = 0;
  private settled = false;
  private grace: NodeJS.Timeout | undefined;
  private readonly timer: NodeJS.Timeout;
  private readonly child: ChildProcess;

  constructor(private readonly spec: ProcessSpec, private readonly resolve: (result: ProcessResult) => void, private readonly reject: (error: AgentRunError) => void) {
    this.child = spawn(spec.command, spec.args, { cwd: spec.cwd, env: spec.env, detached: true, stdio: ["pipe", "pipe", "pipe"] });
    this.timer = setTimeout(() => this.fail(new AgentRunError("timeout")), spec.timeoutMs);
    spec.signal.addEventListener("abort", this.onAbort);
    this.child.stdout!.on("data", (data: Buffer) => this.collect("stdout", data));
    this.child.stderr!.on("data", (data: Buffer) => this.collect("stderr", data));
    this.child.on("error", (error: NodeJS.ErrnoException) => this.fail(this.spawnFailure(error)));
    this.child.on("close", (exitCode) => this.finish(() => this.resolve({ stdout: this.stdout, stderr: this.stderr, exitCode })));
    this.child.stdin!.on("error", () => undefined);
    this.child.stdin!.end(spec.stdin);
  }

  private readonly onAbort = () => this.fail(new AgentRunError("cancelled"));

  private spawnFailure(error: NodeJS.ErrnoException) {
    return new AgentRunError(error.code === "ENOENT" ? "missing_binary" : "provider_failed", this.spec.label);
  }

  private collect(stream: "stdout" | "stderr", data: Buffer) {
    this.bytes += data.length;
    if (this.bytes > MAX_OUTPUT_BYTES) return this.fail(new AgentRunError("invalid_output", "output_too_large").withOutputBytes(this.bytes));
    if (stream === "stderr") this.stderr += data.toString("utf8");
    else this.stdout += data.toString("utf8");
    if (stream === "stdout" && !this.grace && this.spec.isComplete?.(this.stdout)) this.scheduleCompletion();
  }

  private scheduleCompletion() {
    const done = () => this.finish(() => this.resolve({ stdout: this.stdout, stderr: this.stderr, exitCode: null }));
    this.grace = setTimeout(done, this.spec.graceMs ?? COMPLETION_GRACE_MS);
  }

  private fail(error: AgentRunError) {
    this.finish(() => this.reject(error));
  }

  private finish(settle: () => void) {
    if (this.settled) return;
    this.settled = true;
    clearTimeout(this.timer);
    clearTimeout(this.grace);
    this.spec.signal.removeEventListener("abort", this.onAbort);
    const pid = this.child.pid;
    (pid ? killGroup(pid) : Promise.resolve()).finally(settle);
  }
}

export function runAgentProcess(spec: ProcessSpec): Promise<ProcessResult> {
  if (spec.signal.aborted) return Promise.reject(new AgentRunError("cancelled"));
  return new Promise((resolve, reject) => { new ProcessRun(spec, resolve, reject); });
}
