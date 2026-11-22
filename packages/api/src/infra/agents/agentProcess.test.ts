import { describe, expect, it } from "vitest";
import { alive, expectFailure, GROUP_GONE_LIMIT_MS, pidFilePath, pidsFrom, registerPidCleanup, run, SHORT_GRACE_MS } from "./agentProcessTestSupport";

registerPidCleanup();

describe("agent process supervisor", () => {
  it("V-04a times out a sleeping CLI and leaves no process of the group alive", async () => {
    const pidFile = pidFilePath("pids.json");
    const started = Date.now();
    await expectFailure(run({ mode: "sleep", ms: 10000, pidFile }, { timeoutMs: 500 }), "timeout");
    expect(Date.now() - started).toBeLessThan(GROUP_GONE_LIMIT_MS);
    const { pid } = await pidsFrom(pidFile);
    expect(alive(pid)).toBe(false);
  });

  it("V-04b cancels within 5 seconds when the signal aborts", async () => {
    const controller = new AbortController();
    const started = Date.now();
    const pending = run({ mode: "sleep", ms: 10000 }, { signal: controller.signal });
    setTimeout(() => controller.abort(), 200);
    await expectFailure(pending, "cancelled");
    expect(Date.now() - started).toBeLessThan(GROUP_GONE_LIMIT_MS);
  });

  it("does not spawn when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expectFailure(run({ mode: "sleep", ms: 10000 }, { signal: controller.signal }), "cancelled");
  });

  it("V-04c keeps the printed answer of a CLI that never exits and ends the process", async () => {
    const result = await run({ mode: "hang" }, { graceMs: SHORT_GRACE_MS, isComplete: (stdout) => stdout.includes("structured_output") });
    expect(JSON.parse(result.stdout).structured_output).toEqual({ ok: true });
    expect(result.exitCode).toBeNull();
  });

  it("V-04d kills a child process of the CLI together with the group", async () => {
    const pidFile = pidFilePath("child.json");
    const pending = run({ mode: "child", pidFile }, { timeoutMs: 1500 });
    await expectFailure(pending, "timeout");
    const { child } = await pidsFrom(pidFile);
    expect(child).toBeTruthy();
    expect(alive(child!)).toBe(false);
  });
});
