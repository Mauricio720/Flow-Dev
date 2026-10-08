import { describe, expect, it } from "vitest";
import type { PackageStore } from "../../database/dao/unifiedPackageDao";
import { approvedLoopFiles, approvedSpecFiles } from "./loopTaskFiles";

type Stored = { id: string; format: string; approvedAt: Date | null; files: Array<{ path: string; sourceText: string }> };

function packagesOf(stored: Stored[]) {
  return {
    list: async () => stored,
    files: async (packageId: string) => stored.find((item) => item.id === packageId)?.files ?? [],
  } as unknown as Pick<PackageStore, "list" | "files">;
}

const SPEC: Stored = { id: "spec", format: "os_spec_v1", approvedAt: new Date(), files: [{ path: "_spec.md", sourceText: "# Spec" }] };
const TASKS: Stored = { id: "tasks", format: "os_tasks_v1", approvedAt: new Date(), files: [{ path: "_tasks.md", sourceText: "# Tasks" }, { path: "task_01.md", sourceText: "# Task 1" }] };

describe("approved loop files", () => {
  it("collects the approved spec and task documents", async () => {
    expect(await approvedLoopFiles(packagesOf([SPEC, TASKS]), "task")).toEqual([{ path: "_spec.md", content: "# Spec" }, { path: "_tasks.md", content: "# Tasks" }, { path: "task_01.md", content: "# Task 1" }]);
  });

  it("returns nothing to send when a package is not approved or a document is unsafe", async () => {
    expect(await approvedLoopFiles(packagesOf([SPEC, { ...TASKS, approvedAt: null }]), "task")).toBeNull();
    expect(await approvedLoopFiles(packagesOf([SPEC]), "task")).toBeNull();
    const leaking = { ...TASKS, files: [{ path: "task_01.md", sourceText: `token ghp_${"a".repeat(30)}` }] };
    expect(await approvedLoopFiles(packagesOf([SPEC, leaking]), "task")).toBeNull();
  });

  it("collects only the approved spec for a task breakdown", async () => {
    expect(await approvedSpecFiles(packagesOf([SPEC, TASKS]), "task")).toEqual([{ path: "_spec.md", content: "# Spec" }]);
    expect(await approvedSpecFiles(packagesOf([{ ...SPEC, approvedAt: null }]), "task")).toBeNull();
  });
});
