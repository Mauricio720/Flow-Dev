import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { computeBundleDigest, validateBundleContract } from "../../application/spec/specBundle";
import { requiredDocuments } from "../../application/spec/specStageDocuments";
import { defaultBundleDirectory, loadSpecBundle } from "./specBundleLoader";

const sha256 = (content: Buffer | string) => createHash("sha256").update(content).digest("hex");
const declared = async () => JSON.parse(await readFile(join(defaultBundleDirectory(), "bundle.json"), "utf8"));

describe("managed skill bundle contract", () => {
  it("UT-027 lets the TechSpec skill run from the Issue and planning input without a PRD", async () => {
    const { contract } = await loadSpecBundle();
    expect(contract.skills["flow-spec-techspec"]).toMatchObject({ allowsWithoutPrd: true, requires: [], acceptsRetainedContext: ["issue", "planning"] });
    expect(contract.skills["flow-spec-tasks"]?.requires).toEqual(["tech_spec"]);
  });

  it("UT-028 rejects a bundle that requires the unified _spec.md output", async () => {
    const bundle = await declared();
    bundle.skills["flow-spec-prd"].outputs.push("_spec.md");
    expect(() => validateBundleContract(bundle)).toThrow(expect.objectContaining({ reason: "runtime_incompatible" }));
    const unforbidden = await declared();
    unforbidden.skills["flow-spec-tasks"].forbiddenOutputs = [];
    expect(() => validateBundleContract(unforbidden)).toThrow(expect.objectContaining({ reason: "runtime_incompatible" }));
  });

  it("rejects permissive permission modes, drifted runtime releases and missing skills", async () => {
    const mutate = async (change: (bundle: Awaited<ReturnType<typeof declared>>) => void) => { const bundle = await declared(); change(bundle); return () => validateBundleContract(bundle); };
    expect(await mutate((bundle) => { bundle.runtime.permissionMode = "approve-all"; })).toThrow();
    expect(await mutate((bundle) => { bundle.runtime.release = "v0.3.0-beta.30"; })).toThrow();
    expect(await mutate((bundle) => { delete bundle.skills["flow-spec-tasks"]; })).toThrow();
    expect(await mutate((bundle) => { bundle.skills["flow-spec-techspec"].requires = ["prd"]; })).toThrow();
  });

  it("computes a stable digest that changes with one byte", async () => {
    const first = await loadSpecBundle();
    expect((await loadSpecBundle()).digest).toBe(first.digest);
    const files = [{ path: "a", content: Buffer.from("x") }, { path: "b", content: Buffer.from("y") }];
    expect(computeBundleDigest(files)).toBe(computeBundleDigest([...files].reverse()));
    expect(computeBundleDigest([files[0]!, { path: "b", content: Buffer.from("z") }])).not.toBe(computeBundleDigest(files));
    expect(first.files).toEqual(expect.arrayContaining(["flow-spec-prd/SKILL.md", "flow-spec-techspec/SKILL.md", "flow-spec-tasks/SKILL.md", "shared/schema/package-index.schema.json"]));
  });
});

async function fixtureDirectories() {
  const found: { route: string; stage: string; path: string }[] = [];
  for (const route of ["prd-route", "tech-spec-route"]) for (const stage of await readdir(join(defaultBundleDirectory(), "fixtures", route))) found.push({ route, stage, path: join(defaultBundleDirectory(), "fixtures", route, stage) });
  return found;
}

describe("compatibility fixtures", () => {
  it("keep each stage package separate, complete and hash-consistent for both routes", async () => {
    const fixtures = await fixtureDirectories();
    expect(fixtures).toHaveLength(5);
    for (const fixture of fixtures) {
      const index = JSON.parse(await readFile(join(fixture.path, `.flow-spec-${fixture.stage}.json`), "utf8"));
      const files = (await readdir(fixture.path)).filter((name) => name !== `.flow-spec-${fixture.stage}.json`);
      expect(files).not.toContain("_spec.md");
      for (const required of requiredDocuments(fixture.stage as "prd").filter((path) => !path.startsWith(".flow-spec"))) expect(files).toContain(required);
      for (const document of index.documents) expect(sha256(await readFile(join(fixture.path, document.path)))).toBe(document.sha256);
      expect(index).toMatchObject({ schemaVersion: 1, stage: fixture.stage });
    }
  });

  it("carries source references that match the exact UTF-8 byte ranges", async () => {
    for (const fixture of await fixtureDirectories()) {
      const index = JSON.parse(await readFile(join(fixture.path, `.flow-spec-${fixture.stage}.json`), "utf8"));
      const references = JSON.stringify(index).match(/\{"documentPath":[^}]+\}/g) ?? [];
      for (const raw of references) {
        const reference = JSON.parse(raw) as { documentPath: string; startByte: number; endByte: number; sourceHash: string };
        const bytes = await readFile(join(fixture.path, reference.documentPath));
        expect(sha256(bytes.subarray(reference.startByte, reference.endByte))).toBe(reference.sourceHash);
      }
    }
  });

  it("models the TechSpec-only route without stories and the PRD route with upstream identities", async () => {
    const only = JSON.parse(await readFile(join(defaultBundleDirectory(), "fixtures/tech-spec-route/tech_spec/.flow-spec-tech_spec.json"), "utf8"));
    const prd = JSON.parse(await readFile(join(defaultBundleDirectory(), "fixtures/prd-route/tech_spec/.flow-spec-tech_spec.json"), "utf8"));
    expect([only.stories, only.upstream]).toEqual([[], []]);
    expect(prd.upstream).toHaveLength(1);
  });
});
