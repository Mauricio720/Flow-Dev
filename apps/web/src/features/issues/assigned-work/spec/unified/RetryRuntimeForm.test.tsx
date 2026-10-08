import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { connectionOf, planOf } from "@/test/taskFlow";
import { RetryRuntimeForm } from "./RetryRuntimeForm";
import type { FlowAction } from "./unifiedContract";

describe("retry runtime choices", () => {
  it("replaces one Loop role while retaining the other role in the new attempt", async () => {
    const base = planOf("failed").actions[0]!;
    const original = base.bindings[0]!;
    const action = { ...base, kind: "loop", loopName: "implement-tasks", loopVersion: "3", bindings: [{ ...original, role: "backend_runtime" }, { ...original, role: "frontend_runtime" }] } as FlowAction;
    const onRetry = vi.fn();
    render(<RetryRuntimeForm action={action} connections={[connectionOf(), connectionOf({ id: "c2", label: "Codex reserva" })]} busy={false} pending={false} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Trocar runtime e retomar" }));
    const frontend = within(screen.getByRole("group", { name: "frontend_runtime" }));
    await userEvent.selectOptions(frontend.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(frontend.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar com estes runtimes" }));
    expect(onRetry).toHaveBeenCalledWith({ backend_runtime: expect.objectContaining({ connectionId: "c1" }), frontend_runtime: expect.objectContaining({ connectionId: "c2" }) });
  });
});
