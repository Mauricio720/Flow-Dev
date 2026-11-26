import { describe, expect, it } from "vitest";
import type { TouchedFile } from "../../database/dao/artifactCaptureDao";
import { folderCandidates, latestOccurrence, markdownFilesOf, needsNewVersion, sha256Of } from "./artifactCapturePlan";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 22, 10, minute));
const touched = (path: string, minute = 0): TouchedFile => ({ path, skill: "spec-writer", occurredAt: at(minute) });

describe("artifact capture plan", () => {
  it("V-16c keeps only Markdown files", () => {
    const files = [touched("docs/a.md"), touched("src/app.ts"), touched("README.MD"), touched("notes.md.bak")];
    expect(markdownFilesOf(files).map((file) => file.path)).toEqual(["docs/a.md"]);
  });

  it("creates a version only when the content differs from the latest one", () => {
    const latest = { artifactId: "a", version: 2, sha256: sha256Of("B") };
    expect(needsNewVersion(null, sha256Of("A"))).toBe(true);
    expect(needsNewVersion(latest, sha256Of("B"))).toBe(false);
    expect(needsNewVersion(latest, sha256Of("A"))).toBe(true);
  });

  it("returns the latest event time as the capture watermark", () => {
    expect(latestOccurrence([touched("a.md", 3), touched("b.md", 9), touched("c.md", 5)])).toEqual(at(9));
    expect(latestOccurrence([])).toBeNull();
  });

  it("adds the Markdown files of the task folder that no edit event touched, as files of the plan", () => {
    const folder = ["docs/specs/x/_tasks.md", "docs/specs/x/task_01.md", "docs/specs/x/notas.txt"];
    expect(folderCandidates([touched("docs/specs/x/task_01.md")], folder)).toEqual([{ path: "docs/specs/x/_tasks.md", skill: "plano-de-execucao" }]);
    expect(folderCandidates([], [])).toEqual([]);
  });
});
