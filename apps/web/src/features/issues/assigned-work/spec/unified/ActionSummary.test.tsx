import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { planOf } from "@/test/taskFlow";
import { ActionSummary } from "./ActionSummary";
import type { FlowAction } from "./unifiedContract";

const PLANNED = planOf("queued").actions[0]!;
const RETRIED = { ...PLANNED.bindings[0]!, connectionLabel: "Codex local", modelId: "gpt-6-luna" };

describe("ActionSummary", () => {
  it("shows the state and runtime of the attempt in flight instead of the planned ones", () => {
    const action: FlowAction = { ...PLANNED, activeRun: { state: "running", bindings: [RETRIED] } };
    render(<ul><ActionSummary index={3} label="Review" action={action} /></ul>);
    expect(screen.getByText("Em execução")).toBeTruthy();
    expect(screen.getByText(/Codex local · gpt-6-luna/)).toBeTruthy();
    expect(screen.queryByText(/Codex principal/)).toBeNull();
  });

  it("falls back to the planned state and runtime without an attempt in flight", () => {
    render(<ul><ActionSummary index={3} label="Review" action={PLANNED} /></ul>);
    expect(screen.getByText("Na fila")).toBeTruthy();
    expect(screen.getByText(/Codex principal/)).toBeTruthy();
  });
});
