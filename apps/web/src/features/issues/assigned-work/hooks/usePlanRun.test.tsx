import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { SCOPE } from "@/test/planEditor";
import { terminalRejection } from "@/test/terminal";
import { usePlanRun } from "./usePlanRun";

const start = vi.mocked(trpc.tasks.plan.run.start.mutate);
const pause = vi.mocked(trpc.tasks.plan.run.pause.mutate);
const RUNNING = { state: "running" as const, reason: null, pausedBy: null, currentItemId: "a", revision: 3 };

describe("usePlanRun", () => {
  it("V-09a sends a single start with one request key even when clicked twice, then refreshes", async () => {
    let finish: (value: never) => void = () => undefined;
    start.mockImplementation(() => new Promise((resolve) => { finish = resolve as never; }));
    const onChanged = vi.fn();
    const { result } = renderHook(() => usePlanRun({ scope: SCOPE, view: planOf([planItemOf("a", ["task_01"])]), onChanged }));
    await act(async () => {
      void result.current.start();
      void result.current.start();
    });
    expect(start).toHaveBeenCalledOnce();
    expect(start.mock.calls[0]![0]).toEqual({ ...SCOPE, requestKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    await act(async () => finish(RUNNING as never));
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("V-09b pauses with the revision of the run and shows the conflict message, reading the plan again", async () => {
    pause.mockRejectedValue(terminalRejection("plan_run_state", "A execução mudou em outra aba. Recarregue.", "CONFLICT"));
    const onChanged = vi.fn();
    const { result } = renderHook(() => usePlanRun({ scope: SCOPE, view: planOf([planItemOf("a", ["task_01"], { started: true })], { run: RUNNING }), onChanged }));
    await act(async () => result.current.pause());
    expect(pause).toHaveBeenCalledWith({ ...SCOPE, revision: 3 });
    expect(result.current.failure).toBe("A execução mudou em outra aba. Recarregue.");
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
