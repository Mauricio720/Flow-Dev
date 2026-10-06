import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { planningOf, publishedDetail, reviewDetail } from "@/test/tasks";
import type { PlanningActions } from "../hooks/usePlanningActions";
import { IDLE_COMMAND } from "../planningCommandState";
import { PlanningStage } from "./PlanningStage";
import { PlanningTimeline } from "./PlanningTimeline";

const actions = (overrides: Partial<PlanningActions> = {}) => ({ command: IDLE_COMMAND, draftRoute: null, setDraftRoute: vi.fn(), reconcile: vi.fn(), resend: vi.fn(), reviewed: vi.fn(), start: vi.fn(), retry: vi.fn(), saveRoute: vi.fn(), approve: vi.fn(), dirty: false, approvalBlocked: false, ...overrides }) as unknown as PlanningActions;
const noop = () => {};

describe("PlanningStage and timeline", () => {
  it("UT-064 gives readers attribution and no enabled mutation controls", () => {
    render(<PlanningStage detail={{ ...reviewDetail(), permissions: { canEdit: false } }} actions={null} onRefresh={noop} />);
    expect(screen.getByText(/Somente leitura/)).toBeTruthy();
    expect(screen.getByText(/Pessoa autora: Ana/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Aprovar planejamento" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Alterar rota" })).toBeNull();
  });

  it("UT-065 asks for a refresh on an unknown lifecycle value", () => {
    render(<PlanningStage detail={reviewDetail({ status: "implementing" as never })} actions={actions()} onRefresh={noop} />);
    expect(screen.getByRole("alert").textContent).toContain("não é reconhecido");
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Aprovar planejamento" })).toBeNull();
  });

  it("UT-050 disables approval while the route choice is dirty", () => {
    render(<PlanningStage detail={reviewDetail()} actions={actions({ dirty: true })} onRefresh={noop} />);
    expect((screen.getByRole("button", { name: "Aprovar planejamento" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Alterar rota" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("enables approval for a clean saved review", () => {
    render(<PlanningStage detail={reviewDetail()} actions={actions()} onRefresh={noop} />);
    expect((screen.getByRole("button", { name: "Aprovar planejamento" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("UT-066 marks only planning as failed while the Issue stays published", () => {
    const failed = { ...publishedDetail(), planning: planningOf({ status: "failed", operation: { id: "o", state: "failed", createdAt: "2026-10-05T12:00:00.000Z", reason: "planning_timeout", retryAt: null } } as never) };
    render(<PlanningTimeline detail={failed} />);
    const items = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(items.find((text) => text.includes("Issue publicada"))).toContain("Concluído");
    expect(items.find((text) => text.includes("Análise falhou"))).toContain("Falhou");
    expect(items.filter((text) => text.includes("Falhou"))).toHaveLength(1);
  });

  it("UT-067 renders one produced-recommendation milestone for the same snapshot", () => {
    const detail = reviewDetail();
    const { rerender } = render(<PlanningTimeline detail={detail} />);
    rerender(<PlanningTimeline detail={structuredClone(detail)} />);
    expect(screen.getAllByText("Recomendação produzida")).toHaveLength(1);
    expect(screen.queryByText(/%|implementação|PR\b/)).toBeNull();
  });

  it("explains the awaiting state and offers the specified action", () => {
    const detail = { ...publishedDetail(), planning: planningOf({ status: "awaiting", eligibility: { canStart: true, reason: null }, permissions: { canStart: true, canRetry: false, canSelectRoute: false, canApprove: false } }) };
    render(<PlanningStage detail={detail} actions={actions()} onRefresh={noop} />);
    expect(screen.getByRole("button", { name: "Analisar próxima etapa" })).toBeTruthy();
    expect(screen.getByText(/recomendar a próxima etapa/)).toBeTruthy();
  });

  it("shows why an ineligible task cannot be analyzed", () => {
    const detail = { ...publishedDetail(), planning: planningOf({ status: "awaiting", eligibility: { canStart: false, reason: "planning_input_limit" } }) };
    render(<PlanningStage detail={detail} actions={actions()} onRefresh={noop} />);
    expect(screen.getByText(/passa do limite que o planejamento aceita/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Analisar próxima etapa" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
