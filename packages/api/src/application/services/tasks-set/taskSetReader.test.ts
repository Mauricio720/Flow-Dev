import { describe, expect, it } from "vitest";
import { manifestWith } from "./manifestFixture";
import { taskFileWith } from "./taskFileFixture";
import { readTaskSet } from "./taskSetReader";
import type { TaskSetSource } from "./taskSetReader";

const FOLDER = "docs/specs/login";

type SourceInput = Partial<Omit<TaskSetSource, "manifest">> & { manifest: string };

function source({ manifest, ...rest }: SourceInput): TaskSetSource {
  return { folder: FOLDER, manifest: { artifactId: "manifest-id", version: 3, content: manifest }, files: [], otherFolders: [], ...rest };
}

describe("readTaskSet", () => {
  it("V-34k takes the status from task_02.md and ignores the Estado table of the manifest", () => {
    const manifest = `${manifestWith({ ids: ["task_01", "task_02"], edges: [["task_01", "task_02"]] })}\n| 02 | completed |\n`;
    const files = [{ artifactId: "a2", path: `${FOLDER}/task_02.md`, content: taskFileWith({ status: "pending", title: "Dois", minis: [false, false] }) }];
    const set = readTaskSet(source({ manifest, files }));
    expect(set.tasks[1]).toMatchObject({ id: "task_02", number: "02", status: "pending", title: "Dois", dependsOn: ["task_01"], artifactId: "a2", path: `${FOLDER}/task_02.md`, miniDone: 0, miniTotal: 2 });
  });

  it("V-34l shows a task without a captured file as unknown, with no title or artifact", () => {
    const set = readTaskSet(source({ manifest: manifestWith({ ids: ["task_01", "task_03"] }), files: [] }));
    expect(set.tasks[1]).toEqual({ id: "task_03", number: "03", title: null, type: null, complexity: null, dependsOn: [], status: "unknown", miniDone: 0, miniTotal: 0, artifactId: null, path: null });
  });

  it("keeps the manifest order and ignores files outside the set folder", () => {
    const files = [{ artifactId: "x", path: "docs/specs/login-old/task_01.md", content: taskFileWith({ status: "completed" }) }];
    const set = readTaskSet(source({ manifest: manifestWith({ ids: ["task_02", "task_01"] }), files }));
    expect(set.tasks.map((task) => [task.id, task.status])).toEqual([["task_02", "unknown"], ["task_01", "unknown"]]);
  });

  it("returns the problem and no tasks for an invalid manifest, with the version and other folders", () => {
    const set = readTaskSet(source({ manifest: "# sem frontmatter", otherFolders: ["docs/specs/old"] }));
    expect(set).toEqual({ folder: FOLDER, manifestArtifactId: "manifest-id", manifestVersion: 3, problem: "o frontmatter está ausente ou inválido", otherFolders: ["docs/specs/old"], tasks: [] });
  });

  it("reads files at the repository root when the manifest has no folder", () => {
    const files = [{ artifactId: "a1", path: "task_01.md", content: taskFileWith({ status: "done" }) }];
    const set = readTaskSet(source({ manifest: manifestWith({ ids: ["task_01"] }), files, folder: "" }));
    expect(set.tasks[0]).toMatchObject({ status: "completed", path: "task_01.md" });
  });
});
