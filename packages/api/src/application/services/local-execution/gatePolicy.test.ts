import { describe, expect, it } from "vitest";
import { LocalExecutionError } from "./localExecutionErrors";
import { resolveGateManifest } from "./gatePolicy";

describe("resolveGateManifest", () => {
  it("UT-059 refuses a missing mandatory instruction source", () => {
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [declaration({ sourceText: "" })] })).toThrowError(expect.objectContaining({ reason: "instructions_invalid" }));
  });

  it("UT-060 and UT-067 keep an empty manifest when only incidental scripts exist", () => {
    expect(resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "package.json", text: '{"scripts":{"lint":"eslint ."}}' }] }).requiredGates).toEqual([]);
  });

  it("UT-132 derives only explicitly required commands and cites their source", () => {
    const manifest = resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "AGENTS.md", text: "Required gate: pnpm lint" }] });
    expect(manifest.requiredGates).toMatchObject([{ id: "pnpm-lint", label: "pnpm lint", argv: ["pnpm", "lint"], cwd: ".", kind: "command" }]);
    expect(manifest.sources.find((source) => source.path === "AGENTS.md#L1")?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("UT-133 rejects shell syntax in an explicitly mandatory command", () => {
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "AGENTS.md", text: "Required gate: pnpm lint && echo done" }] })).toThrowError(expect.objectContaining({ reason: "gate_policy_unresolved" }));
  });

  it("UT-133 fails closed when a mandatory command is described outside the supported declaration syntax", () => {
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "AGENTS.md", text: "You must run pnpm lint before merging." }] })).toThrowError(expect.objectContaining({ reason: "gate_policy_unresolved" }));
  });

  it("UT-134 keeps the required gate list empty when instructions declare no mandatory command", () => {
    expect(resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "AGENTS.md", text: "Use the repository's preferred style." }] }).requiredGates).toEqual([]);
  });

  it("UT-132 pins the source hash and required command digest", () => {
    const manifest = resolveGateManifest({ actionKind: "implementation", declarations: [declaration({})] });
    expect(manifest.requiredGates[0]).toMatchObject({ id: "lint", argv: ["pnpm", "lint"], cwd: ".", kind: "command" });
    expect(manifest.sources[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("pins instruction sources even when they contain no gate declarations", () => {
    const manifest = resolveGateManifest({ actionKind: "implementation", declarations: [], sources: [{ path: "AGENTS.md", text: "read before work" }] });
    expect(manifest.sources).toMatchObject([{ path: "AGENTS.md", sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }]);
  });

  it("UT-133 blocks unresolved mandatory commands", () => {
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [declaration({ argv: [] })] })).toThrowError(new LocalExecutionError("gate_policy_unresolved"));
  });

  it("rejects non-local service checks and checkout traversal", () => {
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [declaration({ serviceUrls: ["https://example.com/health"] })] })).toThrowError(expect.objectContaining({ reason: "gate_policy_unresolved" }));
    expect(() => resolveGateManifest({ actionKind: "implementation", declarations: [declaration({ cwd: "../other" })] })).toThrowError(expect.objectContaining({ reason: "gate_policy_unresolved" }));
  });
});

function declaration(overrides: Partial<Parameters<typeof resolveGateManifest>[0]["declarations"][number]>) {
  return { id: "lint", label: "Lint", argv: ["pnpm", "lint"], cwd: ".", sourcePath: "AGENTS.md", sourceText: "Required gate: pnpm lint", kind: "command" as const, ...overrides };
}
