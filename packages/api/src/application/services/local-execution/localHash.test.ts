import { describe, expect, it } from "vitest";
import { localPayloadHash } from "./localHash";

describe("localPayloadHash", () => {
  it("is stable when a stored payload comes back with reordered keys", () => {
    const sent = { preparationId: "p-1", actionId: "a-1", action: { kind: "create_spec", workspace: { kind: "local", target: { machineId: "m-1", linkId: "l-1" } } } };
    const stored = { action: { kind: "create_spec", workspace: { kind: "local", target: { linkId: "l-1", machineId: "m-1" } } }, actionId: "a-1", preparationId: "p-1" };
    expect(localPayloadHash(stored)).toBe(localPayloadHash(sent));
  });

  it("still distinguishes different values and array order", () => {
    expect(localPayloadHash({ files: ["a", "b"] })).not.toBe(localPayloadHash({ files: ["b", "a"] }));
    expect(localPayloadHash({ outcome: "failed" })).not.toBe(localPayloadHash({ outcome: "succeeded" }));
  });
});
