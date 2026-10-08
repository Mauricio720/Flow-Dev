import { describe, expect, it } from "vitest";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import { providersEnvironment, snapshotProviders } from "./runProviders";

const choice = (connectionId: string, providerId: "codex" | "claude") => ({ connectionId, providerId, modelId: "m", reasoningEffort: null });
const base = { language: "pt-BR" as const, connectionRevisions: {}, connectionLabels: {}, accountFingerprints: {}, compozyVersion: "v", worktreeId: null, workspace: { kind: "isolated" as const } };

describe("run providers", () => {
  it("lists one provider per connection for a skill snapshot", () => {
    const snapshot = { ...base, kind: "create_spec", runtime: choice("c1", "codex"), runtimeProviderIds: { c1: "codex-aaaa11112222" } } as ActionSnapshot;
    expect(providersEnvironment(snapshotProviders(snapshot))).toBe("codex-aaaa11112222:codex:c1");
  });

  it("deduplicates connections shared by several Loop roles and keeps each provider kind", () => {
    const snapshot = { ...base, kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: {}, runtimeProviderIds: { c1: "codex-aaaa11112222", c2: "claude-bbbb33334444" }, runtimeBindings: { backend_runtime: choice("c1", "codex"), frontend_runtime: choice("c2", "claude"), default_runtime: choice("c1", "codex") } } as ActionSnapshot;
    expect(providersEnvironment(snapshotProviders(snapshot))).toBe("codex-aaaa11112222:codex:c1;claude-bbbb33334444:claude:c2");
  });
});
