import type { FlowAction } from "../../../application/services/task-flow/flowContracts";

export type PromptTask = { title: string; bodyMarkdown: string; issueNumber: number };

const SKILL_BY_KIND: Record<string, string> = { create_spec: "cy-create-spec", create_tasks: "cy-create-tasks" };
const OUTPUT_BY_KIND: Record<string, string> = {
  create_spec: "Create non-empty _spec.md, _user_stories.md, _dx.md and _tests.md files. Create _uiux.md when the spec covers UI, UX, frontend or interfaces. The _spec.md file must contain explicit Product and Technical headings.",
  create_tasks: "Create a non-empty _tasks.md manifest and at least one non-empty task_N.md file.",
};

const LANGUAGE_NAMES = { "pt-BR": "Brazilian Portuguese (pt-BR)", en: "English" } as const;

function editorialInstructions(action: Extract<FlowAction, { kind: "create_spec" | "create_tasks" }>) {
  const language = LANGUAGE_NAMES[action.language];
  const common = `Write all human-facing artifact content in ${language}. Keep literal code identifiers, paths, API names and required schema keys unchanged.`;
  if (action.kind === "create_tasks") return common;
  const title = action.language === "pt-BR" ? "Resumo executivo" : "Executive summary";
  return `${common} In the Product part of _spec.md, start with a \"${title}\" section that lets a person understand the proposal before reading details. Limit it to 180 words and explicitly cover: what changes, why it matters, key decisions, risks or constraints, and unresolved questions. Prefer short labeled bullets over dense paragraphs.`;
}

export function buildUnifiedPrompt(input: { action: FlowAction; task: PromptTask; workspaceRoot?: string }) {
  const skill = SKILL_BY_KIND[input.action.kind];
  const output = OUTPUT_BY_KIND[input.action.kind];
  if (!skill || !output) throw new Error("unsupported_action_kind");
  if (input.action.kind === "loop") throw new Error("unsupported_action_kind");
  const artifactDirectory = `${(input.workspaceRoot ?? "/workspace").replace(/\/$/, "")}/.flow-spec`;
  return [
    `Use the ${skill} skill for GitHub issue #${input.task.issueNumber}: ${input.task.title}.`,
    editorialInstructions(input.action),
    ...(input.action.kind === "create_spec" ? ["Before writing, inspect the issue and repository for unresolved product and technical decisions. Ask focused clarification questions through the runtime interaction mechanism when the evidence cannot settle a decision, and wait for the author's answer. Do not silently decide user priorities or invent missing requirements. Reuse decisions already recorded in the issue or repository."] : []),
    ...(input.action.kind === "create_tasks" ? [`Read the approved _spec.md and companion documents in ${artifactDirectory} before decomposing tasks. Preserve the approved Product and Technical decisions. Write task outputs in the same directory without changing the approved spec files.`] : []),
    `Create ${artifactDirectory} and write every artifact inside it. Do not only describe the result in your response.`,
    output,
    `Before ending the turn, verify that every required file exists under ${artifactDirectory} and is non-empty. Never run commit, push or publication commands.`,
    "Issue body:",
    input.task.bodyMarkdown,
  ].join("\n\n");
}
