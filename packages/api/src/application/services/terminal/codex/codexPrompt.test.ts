import { describe, expect, it } from "vitest";
import { buildDefaultPrompt } from "../terminalPromptBuilder";
import { buildExecutionPrompt, buildGenerationPrompt } from "../taskPlanPrompts";
import { codexTurnInput } from "./codexTurnInput";

const CONTEXT = "/session/context";

describe("Codex turn inputs and prompts", () => {
  it("uses the context skill path for route and generation prompts", () => {
    const route = codexTurnInput({ prompt: buildDefaultPrompt({ route: "tech_spec", issueNumber: 8, title: "Login", url: "https://example.test/8", body: "Contexto", complexity: "medium", reasons: [], uncertainties: [] }), contextDir: CONTEXT });
    const generation = codexTurnInput({ prompt: buildGenerationPrompt("docs/specs/login/spec.md"), contextDir: CONTEXT });
    expect(route.input[0]).toEqual({ type: "skill", name: "spec-writer", path: `${CONTEXT}/skills/spec-writer/SKILL.md` });
    expect(route.displayText).toContain("[spec-writer] Escreva a spec");
    expect(generation.input[0]).toEqual({ type: "skill", name: "spec-to-tasks", path: `${CONTEXT}/skills/spec-to-tasks/SKILL.md` });
    expect(generation.displayText).toContain("[spec-to-tasks] Quebre em tarefas");
  });

  it("routes explicit user skill messages and preserves unknown skill names", () => {
    expect(codexTurnInput({ prompt: "$spec-writer revise esta spec", contextDir: CONTEXT })).toMatchObject({ input: [{ type: "skill", path: `${CONTEXT}/skills/spec-writer/SKILL.md` }, { type: "text", text: "revise esta spec" }], displayText: "[spec-writer] revise esta spec" });
    expect(codexTurnInput({ prompt: "$not-installed mantenha o texto", contextDir: CONTEXT })).toEqual({ input: [{ type: "text", text: "$not-installed mantenha o texto", text_elements: [] }], displayText: "$not-installed mantenha o texto" });
  });

  it("keeps plan execution in execution mode and sends image attachments as localImage", () => {
    const plan = buildExecutionPrompt({ folder: "docs/specs/login", taskPaths: ["docs/specs/login/task_01.md"] });
    const result = codexTurnInput({ prompt: `${plan}\n\nAnexos (leia antes de começar):\n- foto (image/png): /session/context/anexos/foto.png\n- spec (text/markdown): /session/context/anexos/spec.md`, contextDir: CONTEXT });
    expect(result.input[0]).toMatchObject({ type: "text", text: expect.stringContaining("Implemente, nesta ordem, as tarefas") });
    expect(result.input[1]).toEqual({ type: "localImage", path: "/session/context/anexos/foto.png" });
    expect(result.input[0]).toMatchObject({ text: expect.stringContaining("spec (text/markdown)") });
  });
});
