import { describe, expect, it } from "vitest";
import { reasonMessage } from "./taskCopy";
import * as copy from "./planningCopy";

function textsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(textsOf);
  return [];
}

describe("planning copy", () => {
  it("V-09f never mentions the Dev Control", () => {
    for (const text of textsOf(copy)) expect(text).not.toContain("Dev Control");
  });

  it("names the provider of a planning usage limit and has its own text for the new failures", () => {
    expect(reasonMessage("planning_rate_limited", "Codex")).toContain("A assinatura do Codex atingiu o limite de uso.");
    expect(reasonMessage("planning_local_agent_unavailable", "Claude Code: rode `claude` e faça login")).toContain("O Claude Code não está disponível nesta máquina");
    expect(reasonMessage("planning_agent_settings_invalid")).toContain("O modelo configurado para este agente não está mais disponível.");
    expect(reasonMessage("planning_provider_unavailable")).toContain("agente de planejamento");
  });
});
