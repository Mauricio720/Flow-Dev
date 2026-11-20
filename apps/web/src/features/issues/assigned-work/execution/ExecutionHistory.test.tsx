import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TaskExecutionStatus } from "./executionTypes";
import { ExecutionHistory } from "./ExecutionHistory";

const history = [{ executionId: "execution-1", state: "failed", attempt: 1, finishedAt: "2026-11-20T12:00:00.000Z" }] as TaskExecutionStatus["history"];

describe("ExecutionHistory", () => {
  it("summarizes prior executions", () => {
    render(<ExecutionHistory history={history} />);
    expect(screen.getByText("Execuções anteriores (1)")).toBeTruthy();
    expect(screen.getByText(/Falhou · tentativa 1/)).toBeTruthy();
  });
});
