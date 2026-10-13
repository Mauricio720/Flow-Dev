import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { connectionOf, planOf } from "@/test/taskFlow";
import { RetryRuntimeForm } from "./RetryRuntimeForm";
import type { FlowAction } from "./unifiedContract";

describe("retry runtime choices", () => {
  it("identifies an expired preparation after a failed run", () => {
    render(<RetryRuntimeForm action={planOf("failed").actions[0]!} connections={[connectionOf()]} busy={false} pending={false} preparation={{ id: "p1", state: "expired", reason: null }} onRetry={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toMatch(/preparação local expirou/);
    expect(screen.getByRole("alert").textContent).not.toMatch(/conector local/);
  });

  it("replaces one Loop role while retaining the other role in the new attempt", async () => {
    const base = planOf("failed").actions[0]!;
    const original = base.bindings[0]!;
    const action = { ...base, kind: "loop", loopName: "implement-tasks", loopVersion: "3", bindings: [{ ...original, role: "backend_runtime" }, { ...original, role: "frontend_runtime" }] } as FlowAction;
    const onRetry = vi.fn();
    render(<RetryRuntimeForm action={action} connections={[connectionOf(), connectionOf({ id: "c2", label: "Codex reserva" })]} busy={false} pending={false} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Escolher outros modelos" }));
    const frontend = within(screen.getByRole("group", { name: "Agente de frontend" }));
    await userEvent.selectOptions(frontend.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(frontend.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo com estes modelos" }));
    expect(onRetry).toHaveBeenCalledWith({ backend_runtime: expect.objectContaining({ connectionId: "c1" }), frontend_runtime: expect.objectContaining({ connectionId: "c2" }) });
  });

  it("asks for one model per agent when the Loop definition started declaring them after the last attempt", async () => {
    const base = planOf("failed").actions[0]!;
    const action = { ...base, kind: "loop", loopName: "review-and-fix", loopVersion: "0", bindings: [{ ...base.bindings[0]!, role: "worker" }] } as FlowAction;
    const onRetry = vi.fn();
    render(<RetryRuntimeForm action={action} renewedRoles={["reviewer_runtime", "fixer_runtime"]} connections={[connectionOf(), connectionOf({ id: "c2", label: "Codex reserva" })]} busy={false} pending={false} onRetry={onRetry} />);
    expect(screen.getByRole("status").textContent).toMatch(/um modelo para cada agente/);
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveProperty("disabled", true);
    await userEvent.click(screen.getByRole("button", { name: "Escolher outros modelos" }));
    const fixer = within(screen.getByRole("group", { name: "Agente corretor" }));
    await userEvent.selectOptions(fixer.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(fixer.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo com estes modelos" }));
    expect(onRetry).toHaveBeenCalledWith({ reviewer_runtime: expect.objectContaining({ connectionId: "c1" }), fixer_runtime: expect.objectContaining({ connectionId: "c2" }) });
  });

  it("explains why the previous models cannot be reused and what is still missing", async () => {
    const action = planOf("failed").actions[0]!;
    const unconfirmed = connectionOf({ ready: false, reason: "catalog_stale", models: [{ modelId: "gpt-5.6-sol", displayName: "gpt-5.6-sol", selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] }] });
    render(<RetryRuntimeForm action={action} connections={[unconfirmed, connectionOf({ id: "c2", label: "Codex reserva" })]} busy={false} pending={false} onRetry={vi.fn()} />);
    expect(within(screen.getByRole("definition")).getByText(/indisponível agora/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveProperty("disabled", true);
    await userEvent.click(screen.getByRole("button", { name: "Escolher outros modelos" }));
    const confirm = screen.getByRole("button", { name: "Tentar de novo com estes modelos" });
    expect(confirm).toHaveProperty("disabled", true);
    expect(screen.getByText(/não conseguiu confirmar agora quais modelos esta conexão oferece/)).toBeTruthy();
    expect(screen.getByText("Falta completar a escolha de: Agente.")).toBeTruthy();
    expect(within(screen.getByLabelText("Raciocínio")).getByRole("option").textContent).toBe("Indisponível para este modelo");
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    expect(confirm).toHaveProperty("disabled", false);
    expect(screen.queryByText(/Falta completar a escolha de/)).toBeNull();
  });
});
