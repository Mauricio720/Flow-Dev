import { describe, expect, it, vi } from "vitest";
import type { FlowTransaction } from "../../database/dao/flowUnitOfWork";
import type { RunRecord } from "../../database/dao/taskFlowDao";
import { validateTaskPackage, validateUnifiedPackage, type PackageFile } from "./artifactValidator";
import { PackageCapture } from "./packageCapture";
import { TaskFlowError } from "./taskFlowErrors";

const SPEC = "# Spec\n\n## Product\n\n### Resumo executivo\n\nO que muda e por quê.\n\n## Technical\n\nComo funciona.\n";
const COMPANIONS: PackageFile[] = ["_user_stories.md", "_dx.md", "_tests.md"].map((path) => ({ path, content: `# ${path}\n\nconteúdo` }));
const valid = (spec = SPEC): PackageFile[] => [{ path: "_spec.md", content: spec }, ...COMPANIONS];

const diagnosticsOf = (files: PackageFile[]) => {
  try { validateUnifiedPackage(files); } catch (error) { return error instanceof TaskFlowError ? { reason: error.reason, diagnostics: error.details?.diagnostics } : null; }
  return null;
};

describe("unified package validation", () => {
  it("UT-017 rejects _spec.md without a Technical part and creates no review package", async () => {
    const files = valid("# Spec\n\n## Product\n\n### Resumo executivo\n\nSó produto.\n");
    expect(diagnosticsOf(files)).toEqual({ reason: "package_invalid", diagnostics: ["spec_missing_technical_part"] });
    const insert = vi.fn();
    const unit = { run: async (callback: (transaction: FlowTransaction) => Promise<unknown>) => callback({ flow: { packages: { insert } } } as unknown as FlowTransaction) };
    const capture = new PackageCapture(unit as never, { read: async () => files });
    await expect(capture.capture({ id: "r1", taskId: "t1", snapshot: { kind: "create_spec" } } as unknown as RunRecord)).rejects.toMatchObject({ reason: "package_invalid" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("accepts a complete package with a SHA-256 manifest and required flags", () => {
    const result = validateUnifiedPackage(valid());
    expect(result.manifest).toMatchObject({ format: "os_spec_v1", parts: ["product", "technical"] });
    expect(result.files.map((file) => [file.path, file.role, file.required])).toEqual([["_spec.md", "spec", true], ["_user_stories.md", "user_stories", true], ["_dx.md", "dx", true], ["_tests.md", "tests", true]]);
    expect(result.files[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("requires a human-readable executive summary in Portuguese or English", () => {
    const missing = "# Spec\n\n## Product\n\nQuem usa.\n\n## Technical\n\nComo funciona.\n";
    expect(diagnosticsOf(valid(missing))?.diagnostics).toEqual(["spec_missing_executive_summary"]);
    expect(diagnosticsOf(valid(SPEC))).toBeNull();
    expect(diagnosticsOf(valid(SPEC.replace("Resumo executivo", "Executive summary")))).toBeNull();
  });

  it("requires _uiux.md for UI-bearing specs and reports missing companions", () => {
    const ui = valid("# Spec\n\n## Product\n\n### Resumo executivo\n\nNova interface.\n\n## Technical\n\nTela.\n");
    expect(diagnosticsOf(ui)?.diagnostics).toEqual(["missing_required_file:_uiux.md"]);
    expect(diagnosticsOf([{ path: "_spec.md", content: SPEC }])?.diagnostics).toEqual(["missing_required_file:_user_stories.md", "missing_required_file:_dx.md", "missing_required_file:_tests.md"]);
  });

  it("rejects unsafe paths, duplicates and empty files", () => {
    expect(diagnosticsOf([...valid(), { path: "../etc/passwd", content: "x" }])?.diagnostics).toContain("unexpected_file:../etc/passwd");
    expect(diagnosticsOf([...valid(), { path: "_dx.md", content: "outra" }])?.diagnostics).toContain("package_file_count_invalid");
    expect(diagnosticsOf([...valid().slice(0, 3), { path: "_tests.md", content: "  " }])?.diagnostics).toContain("file_size_invalid:_tests.md");
  });

  it("validates task packages as a manifest plus task documents", () => {
    const files = [{ path: "_tasks.md", content: "# Tasks\n\n## Task ordering\n" }, { path: "task_01.md", content: "# Task 01\n\nImplementa" }];
    expect(validateTaskPackage(files)).toMatchObject({ format: "os_tasks_v1", files: [{ role: "tasks_manifest", required: true }, { role: "task", required: true }] });
    expect(() => validateTaskPackage([{ path: "_tasks.md", content: "# Tasks" }])).toThrowError(expect.objectContaining({ reason: "package_invalid" }));
  });
});
