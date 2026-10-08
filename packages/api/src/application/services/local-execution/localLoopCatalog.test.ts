import { describe, expect, it } from "vitest";
import type { LoopDefinition } from "../../software/compozyControlGateway";
import { localLoopCatalogSchema, publishableLoops } from "./localLoopCatalog";

const loop = (overrides: Partial<LoopDefinition> = {}): LoopDefinition => ({
  name: "implement-tasks", version: "0", source: "marketplace", enabled: true, description: "Implement task files.",
  inputs: [{ name: "mode", kind: "string", required: false, hasDefault: true, enumValues: ["per-task", "orchestrated"] }],
  runtimeRoles: ["default_runtime"], runtimeLocked: false, requires: [], ...overrides,
});

describe("local loop catalog", () => {
  it("publishes definitions the server accepts and flattens multi-line descriptions", () => {
    const published = publishableLoops([loop({ description: "Implement\n  task files." })]);
    expect(published).toEqual([loop({ description: "Implement task files." })]);
    expect(localLoopCatalogSchema.safeParse(published).success).toBe(true);
  });

  it("drops duplicates and definitions that would fail the heartbeat instead of sending them", () => {
    const published = publishableLoops([loop(), loop({ description: "again" }), loop({ name: "../escape" }), loop({ name: "leaky", description: "see /home/someone/notes" })]);
    expect(published.map((item) => item.name)).toEqual(["implement-tasks"]);
    expect(published[0]?.description).toBe("Implement task files.");
  });

  it("rejects a catalog with repeated names or unknown fields", () => {
    expect(localLoopCatalogSchema.safeParse([loop(), loop()]).success).toBe(false);
    expect(localLoopCatalogSchema.safeParse([{ ...loop(), path: "/tmp/x" }]).success).toBe(false);
  });
});
