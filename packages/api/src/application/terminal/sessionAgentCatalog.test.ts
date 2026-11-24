import { describe, expect, it } from "vitest";
import { AGENT_UNAVAILABLE_REASON, DEFAULT_SESSION_CHOICE, agentAvailability, choiceProblem, modelUnavailableMessage, publishedAgentAvailability } from "./sessionAgentCatalog";
import type { AgentChoice, SessionAgent } from "./sessionAgentCatalog";

const ONLY_CLAUDE: ReadonlySet<SessionAgent> = new Set<SessionAgent>(["claude"]);
const BOTH_AGENTS: ReadonlySet<SessionAgent> = new Set<SessionAgent>(["claude", "codex"]);
const claude = (model: string, effort: string): AgentChoice => ({ agent: "claude", model, effort });

describe("sessionAgentCatalog", () => {
  it("V-44a accepts a catalog choice and rejects another agent's model or an effort outside the levels", () => {
    expect(choiceProblem(claude("opus", "max"), ONLY_CLAUDE)).toBeNull();
    expect(choiceProblem(claude("gpt-6.1-sol", "high"), ONLY_CLAUDE)).toBe("choice_invalid");
    expect(choiceProblem(claude("opus", "turbo"), ONLY_CLAUDE)).toBe("choice_invalid");
    expect(choiceProblem(claude("claude-opus-5-5", "max"), ONLY_CLAUDE)).toBe("choice_invalid");
  });

  it.each(["opus", "sonnet", "haiku"].flatMap((model) => ["low", "medium", "high", "xhigh", "max"].map((effort) => [model, effort])))("V-44a accepts %s with %s, as the V-33 spike refused none", (model, effort) => {
    expect(choiceProblem(claude(model!, effort!), ONLY_CLAUDE)).toBeNull();
  });

  it("V-44b marks the Codex unavailable with the reason and no models while only the Claude is registered", () => {
    const availability = agentAvailability(ONLY_CLAUDE);
    expect(availability).toEqual([
      { agent: "claude", available: true, reason: null, models: ["opus", "sonnet", "haiku"], efforts: ["low", "medium", "high", "xhigh", "max"] },
      { agent: "codex", available: false, reason: "O Codex ainda não conduz sessões no Flow Dev.", models: [], efforts: [] },
    ]);
    expect(choiceProblem({ agent: "codex", model: "gpt-6.1-sol", effort: "high" }, ONLY_CLAUDE)).toBe("agent_unavailable");
  });

  it("V-44b makes the Codex available when it is registered, but it has no model in the catalog yet", () => {
    expect(agentAvailability(BOTH_AGENTS)[1]).toMatchObject({ agent: "codex", available: true, reason: null });
    expect(choiceProblem({ agent: "codex", model: "gpt-6.1-sol", effort: "high" }, BOTH_AGENTS)).toBe("choice_invalid");
    expect(AGENT_UNAVAILABLE_REASON.codex).toBe("O Codex ainda não conduz sessões no Flow Dev.");
  });

  it("V-44c starts every choice in Claude Code, Opus and Maximum, which the catalog accepts", () => {
    expect(DEFAULT_SESSION_CHOICE).toEqual({ agent: "claude", model: "opus", effort: "max" });
    expect(choiceProblem(DEFAULT_SESSION_CHOICE, ONLY_CLAUDE)).toBeNull();
  });

  it("rejects an agent that is not in the catalog", () => {
    expect(choiceProblem({ agent: "gemini" as SessionAgent, model: "opus", effort: "max" }, BOTH_AGENTS)).toBe("choice_invalid");
  });

  it("V-50e validates effort per published Codex model and reports a removed model", () => {
    const status = { available: true, reason: null, version: "0.159.3", refreshedAt: "2026-11-23T00:00:00.000Z", models: [{ id: "m1", label: "One", isDefault: true, efforts: ["high"], defaultEffort: "high" }, { id: "m2", label: "Two", isDefault: false, efforts: ["low"], defaultEffort: "low" }] };
    expect(choiceProblem({ agent: "codex", model: "m1", effort: "high" }, BOTH_AGENTS, status)).toBeNull();
    expect(choiceProblem({ agent: "codex", model: "m1", effort: "low" }, BOTH_AGENTS, status)).toBe("choice_invalid");
    expect(choiceProblem({ agent: "codex", model: "gone", effort: "high" }, BOTH_AGENTS, status)).toBe("model_unavailable");
    expect(modelUnavailableMessage("gone")).toBe("O modelo gone não está mais disponível no Codex. Troque o modelo da sessão.");
  });

  it("V-50a prioritizes the local service heartbeat over a published catalog", () => {
    const status = { available: true, reason: null, version: "0.159.3", refreshedAt: "2026-11-23T00:00:00.000Z", models: [] };
    expect(publishedAgentAvailability(BOTH_AGENTS, status, false)[1]).toMatchObject({ available: false, reason: "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." });
    expect(publishedAgentAvailability(ONLY_CLAUDE, status, true)[1]).toMatchObject({ available: false, reason: AGENT_UNAVAILABLE_REASON.codex });
  });
});
