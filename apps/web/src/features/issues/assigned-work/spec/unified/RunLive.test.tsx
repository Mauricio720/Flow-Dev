import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunLive } from "./RunLive";
import type { FlowRun } from "./unifiedContract";

const activity = { sequence: 1, kind: "lifecycle", at: "2026-10-08T19:58:58Z", preview: "Etapas do Loop: 2/5 concluídas · rodada 1. Nó implement_task · item 3: running.", source: null, tool: null, status: "running" } as const;
const run = { id: "run-1", kind: "loop", loopName: "implement-tasks", state: "running", createdAt: "2026-10-08T19:27:12Z", finishedAt: null, activity } as FlowRun;

describe("live Loop activity", () => {
  it("shows real Compozy progress during implementation", () => {
    render(<RunLive run={run} busy={false} asking={false} onCancel={null} />);
    expect(screen.getByRole("log", { name: "Atividade recente da execução" }).textContent).toContain("2/5 concluídas");
    expect(screen.getByText(activity.preview)).toBeTruthy();
  });

  it("shows an explicit waiting state before the first Loop update", () => {
    render(<RunLive run={{ ...run, activity: null }} busy={false} asking={false} onCancel={null} />);
    expect(screen.getByText("Aguardando a primeira atualização do agente…")).toBeTruthy();
  });
});
