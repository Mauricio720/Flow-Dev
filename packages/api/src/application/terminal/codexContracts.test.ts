import { describe, expect, it } from "vitest";
import type { CodexStatus } from "./codexCatalog";
import { codexAgentAvailability, DEFAULT_SESSION_CHOICE } from "./sessionAgentCatalog";
import { terminalOpenInputSchema, terminalPreflightInputSchema } from "../../schemas/terminal";

const scope = { projectId: "00000000-0000-4000-8000-000000000001", taskId: "00000000-0000-4000-8000-000000000002" };
const routeChoice = { agent: "codex" as const, model: "gpt-5-codex", effort: "high" };

describe("Codex API contracts", () => {
  it("represents per-model labels, defaults and supported efforts", () => {
    const status: CodexStatus = { available: true, reason: null, version: "0.159.3", models: [{ id: "gpt-5-codex", label: "GPT-5 Codex", isDefault: true, efforts: ["medium", "high"], defaultEffort: "high" }, { id: "gpt-5", label: "GPT-5", isDefault: false, efforts: ["low", "medium"], defaultEffort: "medium" }], refreshedAt: "2026-11-23T12:00:00.000Z" };
    const availability = codexAgentAvailability(status);
    expect(availability).toMatchObject({ available: true, models: ["gpt-5-codex", "gpt-5"], efforts: ["medium", "high", "low"] });
    expect(availability.modelOptions).toEqual(status.models);
  });

  it("accepts route choices while preserving legacy input without a choice", () => {
    const legacy = terminalOpenInputSchema.safeParse({ ...scope, prompt: "prompt", requestKey: "00000000-0000-4000-8000-000000000003", attachmentIds: [], issueImageIds: [], allowAdditional: false, purpose: { kind: "route" } });
    const selected = terminalOpenInputSchema.safeParse({ ...scope, prompt: "prompt", requestKey: "00000000-0000-4000-8000-000000000004", attachmentIds: [], issueImageIds: [], allowAdditional: false, purpose: { kind: "route", choice: routeChoice } });
    expect(legacy.success).toBe(true);
    expect(selected.success).toBe(true);
    expect(terminalPreflightInputSchema.parse({ ...scope }).purpose).toEqual({ kind: "route" });
    expect(DEFAULT_SESSION_CHOICE).toEqual({ agent: "claude", model: "opus", effort: "max" });
  });
});
