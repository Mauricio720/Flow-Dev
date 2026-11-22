import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { detailOf, summaryOf } from "@/test/tasks";
import { TaskProgress } from "./TaskProgress";

function failed(reason: string, detail?: string) {
  return detailOf({ task: summaryOf({ status: "generation_failed" }), lastError: { reason, ...(detail ? { detail } : {}) } });
}

function show(detail: ReturnType<typeof failed>) {
  render(<ul><TaskProgress detail={detail} busy={false} onRetry={null} /></ul>);
  return screen.getByRole("alert").textContent ?? "";
}

describe("TaskProgress failure copy", () => {
  it("V-03f names the provider of a usage limit from the failure detail", () => {
    expect(show(failed("provider_usage_limit", "Claude Code"))).toContain("A assinatura do Claude Code atingiu o limite de uso. Tente de novo mais tarde ou troque o provedor nas Configurações do projeto.");
  });

  it("V-03f falls back to the agent when there is no detail", () => {
    expect(show(failed("provider_usage_limit"))).toContain("A assinatura do agente atingiu o limite de uso.");
  });

  it("V-09g explains an unavailable local CLI with the CLI name and what to do", () => {
    const text = show(failed("local_agent_unavailable", "Codex: rode `codex login`"));
    expect(text).toContain("O Codex não está disponível nesta máquina: rode `codex login`.");
  });

  it("V-09g explains a model that left the catalog", () => {
    expect(show(failed("agent_settings_invalid"))).toContain("O modelo configurado para este agente não está mais disponível. Escolha outro nas Configurações do projeto.");
  });
});
