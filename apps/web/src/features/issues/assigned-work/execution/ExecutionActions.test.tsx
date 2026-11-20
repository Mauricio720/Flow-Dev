import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { A, NOW, decisionOf } from "@/test/tasks";
import type { TaskExecutionStatus } from "./executionTypes";
import { ExecutionActions } from "./ExecutionActions";

function statusOf(state: string): TaskExecutionStatus {
  return { canStart: true, startBlockedBy: null, current: { executionId: "execution-1", state }, history: [] } as unknown as TaskExecutionStatus;
}

function props(status: TaskExecutionStatus, overrides: Partial<Parameters<typeof ExecutionActions>[0]> = {}) {
  return { status, decision: decisionOf({ status: "approved", approvedAt: NOW, approvedByUserId: A }), canOperate: true, isAdmin: false, pending: null, error: null, onStart: vi.fn(), onCancel: vi.fn(), ...overrides };
}

afterEach(() => vi.restoreAllMocks());

describe("ExecutionActions", () => {
  it("asks to confirm and retries an unavailable start with the same key", async () => {
    const onStart = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ExecutionActions {...props(statusOf("unavailable"), { onStart })} />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(expect.any(String), 1, true);
  });

  it("confirms cancellation and leaves actions hidden from readers", async () => {
    const onCancel = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { rerender } = render(<ExecutionActions {...props(statusOf("in_progress"), { onCancel })} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar execução" }));
    expect(onCancel).toHaveBeenCalledWith("execution-1");
    rerender(<ExecutionActions {...props(statusOf("failed"), { canOperate: false })} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lets an administrator cancel without exposing a start action", () => {
    render(<ExecutionActions {...props(statusOf("in_progress"), { canOperate: false, isAdmin: true })} />);
    expect(screen.getByRole("button", { name: "Cancelar execução" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Executar no CompozyOS" })).toBeNull();
  });
});
