import { describe, expect, it } from "vitest";
import { buildExecutionPrompt, buildGenerationPrompt } from "./taskPlanPrompts";

const EXECUTION_TAIL = 'Siga o "Como executar" do _tasks.md: uma mini-tarefa por vez; marque [x] e atualize o status no arquivo da tarefa e no _tasks.md só depois de rodar o "Pronto quando". Pare ao terminar essas tarefas e não comece outras. Não faça commit, push nem PR sem eu pedir.';

describe("task plan prompts", () => {
  it("V-37c builds the generation prompt with the spec path, exactly as the spec words it", () => {
    expect(buildGenerationPrompt("docs/specs/login/spec.md")).toBe("/flow-dev:spec-to-tasks Quebre em tarefas a spec docs/specs/login/spec.md. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.");
  });

  it("V-37d builds the execution prompt with the task paths in order, separated by commas, and the folder", () => {
    const prompt = buildExecutionPrompt({ folder: "docs/specs/login", taskPaths: ["docs/specs/login/task_01.md", "docs/specs/login/task_02.md"] });
    expect(prompt).toBe(`Implemente, nesta ordem, as tarefas docs/specs/login/task_01.md, docs/specs/login/task_02.md de docs/specs/login. ${EXECUTION_TAIL}`);
  });

  it("V-37d names the repository root when the set has no folder", () => {
    expect(buildExecutionPrompt({ folder: "", taskPaths: ["task_01.md"] })).toBe(`Implemente, nesta ordem, as tarefas task_01.md na raiz do repositório. ${EXECUTION_TAIL}`);
  });

  it.each([
    ["a parent segment", "docs/specs/../../etc/x.md"],
    ["an absolute path", "/home/x/task_01.md"],
    ["a Windows separator", "docs\\specs\\spec.md"],
    ["an empty path", ""],
  ])("V-37e refuses %s in the generation prompt", (_name, path) => {
    expect(() => buildGenerationPrompt(path)).toThrowError(expect.objectContaining({ reason: "invalid_path" }));
  });

  it("V-37e refuses unsafe task paths, an unsafe folder, a task outside the folder and an empty list", () => {
    const refuse = (input: { folder: string; taskPaths: string[] }) => expect(() => buildExecutionPrompt(input)).toThrowError(expect.objectContaining({ reason: "invalid_path" }));
    refuse({ folder: "docs/specs/login", taskPaths: ["docs/specs/login/../../etc/x.md"] });
    refuse({ folder: "docs/specs/login", taskPaths: ["/home/x/task_01.md"] });
    refuse({ folder: "../fora", taskPaths: ["../fora/task_01.md"] });
    refuse({ folder: "docs/specs/login", taskPaths: ["docs/specs/outra/task_01.md"] });
    refuse({ folder: "docs/specs/login", taskPaths: [] });
  });

  it("keeps a file name that merely contains two dots", () => {
    expect(buildGenerationPrompt("docs/specs/v1..2/spec.md")).toContain("docs/specs/v1..2/spec.md");
  });
});
