import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentKind } from "../../application/agents/agentTypes";

const RESOURCES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "resources", "agents");
const SECTION_SEPARATOR = "\n\n---\n\n";

const INSTRUCTION_FILES: Record<AgentKind, Array<{ file: string; title?: string }>> = {
  issue_author: [
    { file: "rules.md" },
    { file: "SKILL.md" },
    { file: "boundaries.md", title: "Boundaries" },
    { file: "examples.md", title: "Examples" },
  ],
  planning: [{ file: "rules.md" }, { file: "SKILL.md" }],
};

const AGENT_DIRECTORY: Record<AgentKind, string> = { issue_author: "issue-author", planning: "planning" };

function readSection(input: { root: string; agent: AgentKind; entry: { file: string; title?: string } }) {
  const { root, agent, entry } = input;
  const text = readFileSync(join(root, AGENT_DIRECTORY[agent], entry.file), "utf8").trim();
  return entry.title ? `## ${entry.title}\n\n${text}` : text;
}

export function loadInstructions(agent: AgentKind, root = RESOURCES_ROOT) {
  return INSTRUCTION_FILES[agent].map((entry) => readSection({ root, agent, entry })).join(SECTION_SEPARATOR);
}
