import { describe, expect, it } from "vitest";
import { taskFileWith } from "./taskFileFixture";
import { parseTaskFile } from "./taskFileParser";

describe("parseTaskFile", () => {
  it.each([
    ["pending", "pending"],
    ["in_progress", "in_progress"],
    ["completed", "completed"],
    ["done", "completed"],
    ["finished", "completed"],
    ["blocked", "unknown"],
    [undefined, "unknown"],
  ])("V-34h maps the frontmatter status %s to %s", (status, expected) => {
    expect(parseTaskFile(taskFileWith({ status })).status).toBe(expected);
  });

  it("V-34i counts only the top-level checkboxes of the Mini-tarefas section", () => {
    const content = taskFileWith({ minis: [true, false, true], extraSection: "## Testes atribuídos\n- [ ] V-01: caso\n- [x] V-02: caso" });
    expect(parseTaskFile(content)).toMatchObject({ miniDone: 2, miniTotal: 3 });
  });

  it("V-34i ignores an indented checkbox that is not at the start of the line", () => {
    const content = "---\nstatus: pending\n---\n## Mini-tarefas\n- [ ] **a**\n  - [ ] sub-item\n    - [x] outro\n";
    expect(parseTaskFile(content)).toMatchObject({ miniDone: 0, miniTotal: 1 });
  });

  it("V-34j keeps completed with two of three mini-tasks checked, inferring nothing", () => {
    const parsed = parseTaskFile(taskFileWith({ status: "completed", minis: [true, true, false] }));
    expect(parsed).toMatchObject({ status: "completed", miniDone: 2, miniTotal: 3 });
  });

  it("reads the title, type and complexity, and null for a file without frontmatter", () => {
    expect(parseTaskFile(taskFileWith({ title: "Esquema e DAO", type: "backend", complexity: "high" }))).toMatchObject({ title: "Esquema e DAO", type: "backend", complexity: "high" });
    expect(parseTaskFile("# Só texto\n")).toEqual({ title: null, type: null, complexity: null, status: "unknown", miniDone: 0, miniTotal: 0 });
  });

  it("reads the frontmatter of a title with an unquoted colon, which strict YAML rejects", () => {
    const content = "---\nstatus: in_progress\ntitle: Tela de login: métodos e erros\ntype: frontend\ncomplexity: 'medium'\n---\n## Mini-tarefas\n- [x] **a**\n";
    expect(parseTaskFile(content)).toMatchObject({ title: "Tela de login: métodos e erros", type: "frontend", complexity: "medium", status: "in_progress", miniDone: 1, miniTotal: 1 });
  });
});
