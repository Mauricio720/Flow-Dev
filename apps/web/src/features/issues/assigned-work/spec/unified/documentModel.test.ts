import { describe, expect, it } from "vitest";
import { readDocument } from "./documentModel";

const TASKS_MANIFEST = `---
schema_version: "compozy.tasks/v2"
workflow: flow-spec
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
  edges:
    - from: task_01
      to: task_02
---
# Tarefas
`;

function metaOf(source: string) {
  return readDocument({ id: "doc", label: "Tarefas", path: "_tasks.md", source }).meta;
}

describe("readDocument frontmatter", () => {
  it("reads only top-level scalar fields from nested YAML", () => {
    expect(metaOf(TASKS_MANIFEST)).toEqual([["schema_version", "\"compozy.tasks/v2\""], ["workflow", "flow-spec"]]);
  });

  it("never yields two entries with the same name", () => {
    const names = metaOf("---\nstatus: draft\nstatus: final\n---\n# Doc\n").map(([name]) => name);
    expect(names).toEqual(["status"]);
  });

  it("returns no metadata when the document has no frontmatter", () => {
    expect(metaOf("# Doc\n\nTexto.\n")).toEqual([]);
  });
});
