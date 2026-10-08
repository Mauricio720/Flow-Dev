import { describe, expect, it } from "vitest";
import { actionWithRetryBindings } from "./retryRuntimeBindings";
import type { RuntimeChoice } from "./flowContracts";

const runtime = (connectionId: string): RuntimeChoice => ({ connectionId, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null });
const action = { kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: {}, workspace: { kind: "local" }, bindings: [{ role: "backend_runtime", ...runtime("first") }, { role: "frontend_runtime", ...runtime("second") }] } as never;

describe("retry runtime roles", () => {
  it("replaces all Loop roles without altering its inputs or workspace", () => {
    expect(actionWithRetryBindings(action, { backend_runtime: runtime("replacement"), frontend_runtime: runtime("replacement") })).toMatchObject({
      kind: "loop", loopName: "implement-tasks", inputs: {}, workspace: { kind: "local" }, runtimeBindings: { backend_runtime: runtime("replacement"), frontend_runtime: runtime("replacement") },
    });
  });

  it("rejects omitted and extra roles", () => {
    expect(() => actionWithRetryBindings(action, { backend_runtime: runtime("replacement") })).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
    expect(() => actionWithRetryBindings(action, { backend_runtime: runtime("replacement"), frontend_runtime: runtime("replacement"), extra: runtime("replacement") })).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
  });
});
