import { describe, expect, it } from "vitest";
import { manifestWith, taskIds } from "./manifestFixture";
import { parseManifest } from "./taskManifestParser";

const FRONTMATTER_PROBLEM = "o frontmatter está ausente ou inválido";
const GRAPH_MISSING_PROBLEM = "o grafo de tarefas está ausente";
const VALID = manifestWith({ ids: ["task_01", "task_02", "task_03"], edges: [["task_01", "task_02"], ["task_01", "task_03"]] });

describe("parseManifest", () => {
  it("V-34a reads a valid v2 manifest in file order with its edges", () => {
    const result = parseManifest(VALID);
    expect(result).toEqual({ problem: null, nodes: [{ id: "task_01", file: "task_01.md" }, { id: "task_02", file: "task_02.md" }, { id: "task_03", file: "task_03.md" }], edges: [{ from: "task_01", to: "task_02" }, { from: "task_01", to: "task_03" }] });
  });

  it.each([
    ["without frontmatter", "# Tarefas\n\nsem bloco"],
    ["with broken YAML", "---\nschema_version: [quebrado\n---\n"],
    ["with another schema_version", VALID.replace("compozy.tasks/v2", "compozy.tasks/v1")],
    ["with a node file outside task_NN.md", VALID.replace("file: task_01.md", "file: ../x.md")],
  ])("V-34b rejects a manifest %s as an invalid frontmatter", (_name, content) => {
    expect(parseManifest(content)).toEqual({ problem: FRONTMATTER_PROBLEM });
  });

  it("V-34c reports a missing graph, and an empty node list, as an absent graph", () => {
    const withoutGraph = '---\nschema_version: "compozy.tasks/v2"\nworkflow: demo\n---\n';
    expect(parseManifest(withoutGraph)).toEqual({ problem: GRAPH_MISSING_PROBLEM });
    expect(parseManifest(manifestWith({ ids: [] }).replace("  nodes:\n", "  nodes: []\n"))).toEqual({ problem: GRAPH_MISSING_PROBLEM });
  });

  it("V-34d reports a repeated task id", () => {
    const content = manifestWith({ ids: ["task_01", "task_02", "task_02"] });
    expect(parseManifest(content)).toEqual({ problem: "a tarefa task_02 aparece mais de uma vez" });
  });

  it("V-34e reports a dependency on a task that is not in the graph", () => {
    const content = manifestWith({ ids: ["task_01", "task_02"], edges: [["task_01", "task_09"]] });
    expect(parseManifest(content)).toEqual({ problem: "a dependência task_01 → task_09 cita uma tarefa inexistente" });
  });

  it("V-34f reports a dependency cycle, including a task that depends on itself", () => {
    const cycle = manifestWith({ ids: taskIds(3), edges: [["task_01", "task_02"], ["task_02", "task_03"], ["task_03", "task_01"]] });
    const selfLoop = manifestWith({ ids: taskIds(2), edges: [["task_02", "task_02"]] });
    expect(parseManifest(cycle)).toEqual({ problem: "as dependências formam um ciclo" });
    expect(parseManifest(selfLoop)).toEqual({ problem: "as dependências formam um ciclo" });
  });

  it("V-34g accepts 30 tasks and rejects 31", () => {
    expect(parseManifest(manifestWith({ ids: taskIds(30) })).problem).toBeNull();
    expect(parseManifest(manifestWith({ ids: taskIds(31) }))).toEqual({ problem: "há mais de 30 tarefas" });
  });
});
