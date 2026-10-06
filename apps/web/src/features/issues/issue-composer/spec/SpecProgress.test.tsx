import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { R1, snapshotOf } from "@/test/spec";
import { SpecProgress } from "./SpecProgress";
import { requiredStages, specLifecycle } from "./specStageModel";

const decision = (summary = "Resumo") => ({ id: "d", version: 1, recommendedRoute: "tech_spec", selectedRoute: "tech_spec", decisionSource: "AI", complexity: "medium", summary, reasons: ["Motivo"], uncertainties: [], status: "approved", createdAt: "x", approvedAt: "x", approvedByUserId: "a" }) as never;
const props = { decision: null, canAct: true, onCancel: vi.fn(), onSelectStage: vi.fn(), onRefresh: vi.fn() };

describe("SpecProgress", () => {
  it("UT-041 lists only TechSpec and Tasks as required stages on the tech_spec route", () => {
    expect(requiredStages("tech_spec")).toEqual(["tech_spec", "tasks"]);
    render(<SpecProgress {...props} snapshot={snapshotOf({ route: "tech_spec", currentStage: "tech_spec" })} />);
    const stages = screen.getByRole("list", { name: "Etapas obrigatórias" });
    expect(stages.textContent).toContain("TechSpec");
    expect(stages.textContent).toContain("Tasks");
    expect(stages.textContent).not.toContain("PRD");
    expect(screen.getByText("O PRD é desnecessário nesta rota.")).toBeTruthy();
  });

  it("UT-042 shows an unavailable-state recovery for an unknown lifecycle without a guessed label", () => {
    const snapshot = snapshotOf({ state: "teleporting" as never });
    expect(specLifecycle(snapshot)).toBe("unknown");
    render(<SpecProgress {...props} snapshot={snapshot} />);
    expect(screen.getByRole("alert").textContent).toContain("não é reconhecido");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(props.onRefresh).toHaveBeenCalled();
  });

  it("IT-003 keeps the selected route named and the full 12,000-character rationale inspectable", () => {
    const long = "r".repeat(12_000);
    render(<SpecProgress {...props} snapshot={snapshotOf({ route: "tech_spec" })} decision={decision(long)} />);
    expect(screen.getByText(/Rota selecionada/).textContent).toContain("Tech Spec");
    expect(screen.getByText(long)).toBeTruthy();
  });

  it("IT-110 offers exactly one cancellation control for the current attempt", () => {
    const attempt = { id: R1, stage: "prd", attemptNumber: 101, kind: "generate", state: "running", terminalReason: null, createdAt: "x" };
    render(<SpecProgress {...props} snapshot={snapshotOf({ attempt, state: "running" } as never)} />);
    const cancel = screen.getAllByRole("button", { name: /Cancelar execução/ });
    expect(cancel).toHaveLength(1);
    expect(cancel[0]!.textContent).toBe("Cancelar execução 101");
    fireEvent.click(cancel[0]!);
    expect(props.onCancel).toHaveBeenCalledWith(R1);
  });

  it("hides cancellation from readers", () => {
    render(<SpecProgress {...props} canAct={false} snapshot={snapshotOf({ attempt: { id: R1, stage: "prd", attemptNumber: 1, kind: "generate", state: "running", terminalReason: null, createdAt: "x" } } as never)} />);
    expect(screen.queryByRole("button", { name: /Cancelar/ })).toBeNull();
  });
});
