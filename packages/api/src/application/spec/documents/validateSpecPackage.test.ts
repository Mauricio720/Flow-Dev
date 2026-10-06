import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../services/spec/specPayload";
import { fixtureFiles } from "../../../../test/spec-fixtures";
import type { SpecStage } from "../../services/spec/specContracts";
import { validateSpecPackage } from "./validateSpecPackage";

const documents = (files: Record<string, string>) => Object.entries(files).map(([path, content]) => ({ path, role: "doc", bytes: Buffer.from(content, "utf8") }));
const run = (stage: SpecStage, files: Record<string, string>, approvedUpstream: { path: string; sha256: string }[] = []) => validateSpecPackage({ stage, documents: documents(files), approvedUpstream });
const codes = (result: ReturnType<typeof run>) => result.diagnostics.filter((item) => item.severity === "blocking").map((item) => item.code);
const withIndex = (stage: SpecStage, files: Record<string, string>, change: (index: Record<string, unknown>) => void) => {
  const index = JSON.parse(files[`.flow-spec-${stage}.json`]!);
  change(index);
  return { ...files, [`.flow-spec-${stage}.json`]: JSON.stringify(index) };
};

describe("validateSpecPackage", () => {
  it("UT-079 accepts every fixture package whose index matches the captured bytes", () => {
    for (const [route, stage] of [["prd-route", "prd"], ["prd-route", "tech_spec"], ["prd-route", "tasks"], ["tech-spec-route", "tech_spec"], ["tech-spec-route", "tasks"]] as const) {
      const result = run(stage, fixtureFiles(route, stage));
      expect({ route, stage, valid: result.valid, blocking: codes(result) }).toEqual({ route, stage, valid: true, blocking: [] });
    }
  });

  it("UT-080 rejects an unknown schema version and a mismatched task title", () => {
    const tech = fixtureFiles("prd-route", "tech_spec");
    expect(codes(run("tech_spec", withIndex("tech_spec", tech, (index) => { index.schemaVersion = 2; })))).toContain("invalid_index");
    const tasks = fixtureFiles("prd-route", "tasks");
    expect(codes(run("tasks", withIndex("tasks", tasks, (index) => { (index.tasks as { title: string }[])[0]!.title = "Outro título"; })))).toContain("title_mismatch");
  });

  it("IT-052 and IT-062 withhold readiness when a required companion is missing or empty", () => {
    const prd = fixtureFiles("prd-route", "prd");
    expect(codes(run("prd", { ...prd, "_user_stories.md": "" }))).toContain("empty_required_document");
    const { "_tests.md": _removed, ...withoutTests } = fixtureFiles("prd-route", "tech_spec");
    const result = run("tech_spec", withoutTests);
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("missing_required_document");
  });

  it("IT-072 and IT-223 name the missing task file and dependency target", () => {
    const tasks = fixtureFiles("prd-route", "tasks");
    const { "task_01.md": _gone, ...withoutTask } = tasks;
    expect(run("tasks", withoutTask).diagnostics.find((item) => item.code === "missing_task_file")?.message).toContain("task_01.md");
    const dangling = withIndex("tasks", tasks, (index) => { (index.tasks as { dependsOn: string[] }[])[0]!.dependsOn = ["task_99"]; });
    expect(run("tasks", dangling).diagnostics.find((item) => item.code === "missing_dependency")?.message).toContain("task_99");
  });

  it("IT-222 reports a duplicated task identity", () => {
    const duplicated = withIndex("tasks", fixtureFiles("prd-route", "tasks"), (index) => { const tasks = index.tasks as unknown[]; tasks.push(tasks[0]); });
    expect(codes(run("tasks", duplicated))).toContain("duplicate_task");
  });

  it("IT-224 and IT-225 report unassigned tests and gates", () => {
    const tasks = fixtureFiles("prd-route", "tasks");
    expect(codes(run("tasks", withIndex("tasks", tasks, (index) => { (index.tasks as { testIds: string[] }[])[0]!.testIds = []; })))).toContain("unassigned_test");
    const tech = fixtureFiles("prd-route", "tech_spec");
    expect(codes(run("tech_spec", withIndex("tech_spec", tech, (index) => { (index.tests as { gateOwner?: string }[])[1]!.gateOwner = ""; })))).toContain("unassigned_gate");
  });

  it("IT-226 reports a material reference with the wrong source hash as an interpretation gap", () => {
    const tech = withIndex("tech_spec", fixtureFiles("prd-route", "tech_spec"), (index) => { (index.tests as { source: { sourceHash: string } }[])[0]!.source.sourceHash = "f".repeat(64); });
    expect(codes(run("tech_spec", tech))).toContain("interpretation_gap");
  });

  it("IT-218 and IT-228 reject a candidate that rewrites an approved upstream document", () => {
    const prd = fixtureFiles("prd-route", "prd");
    const approved = [{ path: "adrs/adr-001.md", sha256: sha256Hex("# ADR aprovado") }];
    expect(codes(run("prd", { ...prd, "adrs/adr-001.md": "# ADR alterado" }, approved))).toContain("upstream_modified");
    expect(codes(run("prd", { ...prd, "adrs/adr-001.md": "# ADR aprovado" }, approved))).not.toContain("upstream_modified");
  });

  it("IT-229 accepts each boundary and returns package_limit one past it", () => {
    const prd = fixtureFiles("prd-route", "prd");
    const big = (size: number) => ({ ...prd, "_prd.md": `# P\n\n${"a".repeat(size - 5)}` });
    expect(codes(run("prd", big(1024 * 1024)))).not.toContain("package_limit");
    expect(codes(run("prd", big(1024 * 1024 + 1)))).toContain("package_limit");
    const files = (count: number) => ({ ...prd, ...Object.fromEntries(Array.from({ length: count }, (_, index) => [`adrs/adr-${String(index + 1).padStart(3, "0")}.md`, "# a"])) });
    expect(codes(run("prd", files(256 - Object.keys(prd).length)))).not.toContain("package_limit");
    expect(codes(run("prd", files(257 - Object.keys(prd).length)))).toContain("package_limit");
    const taskFiles = (count: number) => ({ ...fixtureFiles("prd-route", "tasks"), ...Object.fromEntries(Array.from({ length: count }, (_, index) => [`task_${String(index + 2).padStart(3, "0")}.md`, "# t"])) });
    expect(codes(run("tasks", taskFiles(199)))).not.toContain("package_limit");
    expect(codes(run("tasks", taskFiles(200)))).toContain("package_limit");
    const tests = withIndex("tech_spec", fixtureFiles("prd-route", "tech_spec"), (index) => { const list = index.tests as { id: string }[]; const base = list[1]!; for (let id = 0; id < 4096; id += 1) list.push({ ...base, id: `X-${id}` }); });
    expect(codes(run("tech_spec", tests))).toContain("package_limit");
  });

  it("IT-051 withholds readiness for a material block the model cannot represent", () => {
    const result = run("prd", { ...fixtureFiles("prd-route", "prd"), "_prd.md": "# PRD\n\n<div>ativo</div>\n" });
    expect(result.diagnostics.some((item) => item.code === "raw_html_inert")).toBe(true);
  });
});
