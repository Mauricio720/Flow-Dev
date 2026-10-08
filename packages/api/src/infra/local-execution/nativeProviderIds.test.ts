import { describe, expect, it } from "vitest";
import { withNativeProviderIds } from "./nativeProviderIds";

const choice = (connectionId: string, providerId: string) => ({ connectionId, providerId, modelId: "model-1", reasoningEffort: "high" });

describe("withNativeProviderIds", () => {
  it("runs a skill action under the provider kind the machine catalog was discovered with", () => {
    const snapshot = { kind: "create_spec", runtime: choice("c1", "codex"), runtimeProviderIds: { c1: "local-machine-1-codex" } } as never;
    expect(withNativeProviderIds(snapshot)).toMatchObject({ runtime: { connectionId: "c1" }, runtimeProviderIds: { c1: "codex" } });
    expect(snapshot).toMatchObject({ runtimeProviderIds: { c1: "local-machine-1-codex" } });
  });

  it("maps every role of a loop action", () => {
    const snapshot = { kind: "loop", runtimeBindings: { coder: choice("c1", "codex"), reviewer: choice("c2", "claude") }, runtimeProviderIds: { c1: "local-m-codex", c2: "local-m-claude" } } as never;
    expect(withNativeProviderIds(snapshot)).toMatchObject({ runtimeProviderIds: { c1: "codex", c2: "claude" } });
  });
});
