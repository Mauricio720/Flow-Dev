import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskExecutionCurrent } from "./useTaskExecution";
import { ExecutionStatus } from "./ExecutionStatus";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const TWO_MINUTES_MS = 120_000;

function current(patch: Partial<TaskExecutionCurrent> = {}): TaskExecutionCurrent {
  return {
    executionId: "execution-1", route: "direct_execution", state: "in_progress", attempt: 1, branch: "flow-dev/e2e", agent: "code_implementer", runAttempt: 2,
    review: { outcome: "rejected", summary: "Falta o teste do frete." }, blocks: [], attention: null, failureCode: null, failureDetail: null, specRound: 0,
    pullRequestUrl: null, compozyTaskIdentifiers: ["FD-E2E-1-impl"], lastSyncedAt: NOW.toISOString(), compozyReachable: true, ...patch,
  } as TaskExecutionCurrent;
}

afterEach(() => vi.useRealTimers());

describe("ExecutionStatus", () => {
  it("shows the agent, attempt and rejected review summary", () => {
    render(<ExecutionStatus current={current()} route="Execução direta" canStart={false} blocker={null} />);
    expect(screen.getByText("Revisão pediu ajustes — tentativa 2")).toBeTruthy();
    expect(screen.getByText("Falta o teste do frete.")).toBeTruthy();
    expect(screen.getByText("Agente: code_implementer · Tentativa 2")).toBeTruthy();
  });

  it("shows the CompozyOS task identifier when attention is needed", () => {
    render(<ExecutionStatus current={current({ state: "needs_attention", attention: "Falta uma permissão." })} route={null} canStart={false} blocker={null} />);
    expect(screen.getByText("Precisa de atenção")).toBeTruthy();
    expect(screen.getByText("Resolva no CompozyOS: Task FD-E2E-1-impl")).toBeTruthy();
  });

  it("offers the pull request or explains when the link is missing", () => {
    const url = "https://github.com/acme/cart/pull/87";
    const { rerender } = render(<ExecutionStatus current={current({ state: "completed", review: { outcome: "approved", summary: null }, pullRequestUrl: url })} route={null} canStart={false} blocker={null} />);
    expect(screen.getByRole("link", { name: "Abrir pull request" }).getAttribute("href")).toBe(url);
    rerender(<ExecutionStatus current={current({ state: "completed", review: { outcome: "approved", summary: null }, pullRequestUrl: null })} route={null} canStart={false} blocker={null} />);
    expect(screen.getByText(/PR não encontrado; veja o resultado no CompozyOS: Task FD-E2E-1-impl/)).toBeTruthy();
  });

  it("shows the spec review badge without rendering the spec review panel", () => {
    render(<ExecutionStatus current={current({ state: "spec_review", review: null })} route="PRD" canStart={false} blocker={null} />);
    expect(screen.getByText("Spec pronta para revisão")).toBeTruthy();
    expect(screen.getByText("A spec está pronta para revisão.")).toBeTruthy();
  });

  it("explains a blocker and the unavailable state", () => {
    const { rerender } = render(<ExecutionStatus current={null} route="Execução direta" canStart={false} blocker="execution_blocked_uncertainty" />);
    expect(screen.getByText("Bloqueada para iniciar")).toBeTruthy();
    expect(screen.getByText("Resolva a pendência bloqueante antes de executar.")).toBeTruthy();
    rerender(<ExecutionStatus current={current({ state: "unavailable" })} route={null} canStart={false} blocker={null} />);
    expect(screen.getByText("CompozyOS indisponível")).toBeTruthy();
    expect(screen.getByText("Nada foi iniciado.")).toBeTruthy();
  });

  it("shows stale CompozyOS status with the last sync age", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    render(<ExecutionStatus current={current({ lastSyncedAt: new Date(NOW.getTime() - TWO_MINUTES_MS).toISOString(), compozyReachable: false })} route={null} canStart={false} blocker={null} />);
    expect(screen.getByText("Atualizado há 2 min — CompozyOS indisponível")).toBeTruthy();
  });
});
