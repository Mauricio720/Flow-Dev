import { describe, expect, it } from "vitest";
import { activeItemOf, progressOf } from "@/test/work";
import { progressSummary } from "./workProgress";

const APPROVED = "2026-10-15T10:00:00.000Z";
const approvedPackage = (format: string) => ({ format, version: 1, status: "approved", approvedAt: APPROVED });
const implementing = { kind: "loop", loopName: "implement-tasks", state: "running", concludedAt: null };
const liveRun = { kind: "loop", loopName: "implement-tasks", state: "running", createdAt: APPROVED, activity: null };
const states = (rail: { label: string; state: string }[]) => rail.map((stage) => `${stage.label}:${stage.state}`);

describe("progressSummary", () => {
  it("keeps the flow stages pending while planning is being analyzed", () => {
    const summary = progressSummary(activeItemOf({ stage: "in_progress" }), true);
    expect(summary).toMatchObject({ state: "current", badge: "Planejamento · Em andamento", headline: "O Dev Control está analisando a Issue", run: null });
    expect(states(summary.rail)).toEqual(["Planejamento:current", "Spec:pending", "Tarefas:pending", "Implementação:pending", "Review:pending", "Pull Request:pending"]);
  });

  it("hands the spec to the operator once planning is approved", () => {
    const summary = progressSummary(activeItemOf({ stage: "approved", progress: progressOf({ route: "tech_spec" }) }), true);
    expect(summary).toMatchObject({ state: "yours", badge: "Spec · Aguardando você", headline: "Inicie a spec" });
  });

  it("follows the running implementation and exposes the live run", () => {
    const progress = progressOf({ route: "tech_spec", flow: "unified", actions: [implementing], packages: [approvedPackage("os_spec_v1"), approvedPackage("os_tasks_v1")], activeRun: liveRun });
    const summary = progressSummary(activeItemOf({ stage: "approved", progress }), true);
    expect(summary).toMatchObject({ state: "current", badge: "Implementação · Em andamento", headline: "O Loop está implementando as tarefas", run: liveRun });
    expect(states(summary.rail)).toEqual(["Planejamento:done", "Spec:done", "Tarefas:done", "Implementação:current", "Review:pending", "Pull Request:pending"]);
  });

  it("shows the direct execution followed by its Pull Request on the direct route", () => {
    const progress = progressOf({ route: "direct_execution", flow: "unified", actions: [{ kind: "direct_execute", loopName: null, state: "failed", concludedAt: null }] });
    const summary = progressSummary(activeItemOf({ stage: "approved", progress }), true);
    expect(summary).toMatchObject({ state: "failed", badge: "Execução direta · Falhou", headline: "A execução direta parou" });
    expect(states(summary.rail)).toEqual(["Planejamento:done", "Execução direta:failed", "Pull Request:pending"]);
  });

  it("does not address an observer as the operator", () => {
    const summary = progressSummary(activeItemOf({ stage: "approved", progress: progressOf({ route: "prd" }) }), false);
    expect(summary).toMatchObject({ badge: "Spec · Aguardando a pessoa operadora", headline: "Aguardando a pessoa operadora continuar o fluxo." });
  });
});
