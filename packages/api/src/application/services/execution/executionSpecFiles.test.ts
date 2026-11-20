import { describe, expect, it, vi } from "vitest";
import { readSpecFiles } from "./executionSpecFiles";

const specDir = ".compozy/tasks/fd-spec";
const input = { workspaceId: "workspace", worktreeId: "worktree", specDir };

describe("spec file reading", () => {
  it("UT-025 places the main file first and omits sensitive content", async () => {
    const files = [{ path: `${specDir}/notes.md`, kind: "file" }, { path: `${specDir}/.env`, kind: "file", sensitive: true }, { path: `${specDir}/_spec.md`, kind: "file" }];
    const gateway = { listFileEntries: vi.fn(async () => files), readFile: vi.fn(async ({ path }: { path: string }) => ({ content: path })) };
    await expect(readSpecFiles(gateway, input)).resolves.toEqual([{ path: "_spec.md", content: `${specDir}/_spec.md` }, { path: ".env", sensitive: true }, { path: "notes.md", content: `${specDir}/notes.md` }]);
    expect(gateway.readFile).toHaveBeenCalledTimes(2);
  });

  it("reads files in nested spec directories", async () => {
    const gateway = { listFileEntries: vi.fn(async ({ path }: { path: string }) => path === specDir ? [{ path: `${specDir}/adrs`, kind: "directory" }] : [{ path: `${specDir}/adrs/adr-001.md`, kind: "file" }]), readFile: vi.fn(async () => ({ content: "ADR" })) };
    await expect(readSpecFiles(gateway, input)).resolves.toEqual([{ path: "adrs/adr-001.md", content: "ADR" }]);
  });
});
