import { DIRECT_OUTCOME_FILE, DIRECT_OUTCOME_STATUSES } from "../../../application/services/local-execution/directOutcome";
import { DIRECT_SKILL_NAME } from "../../../application/services/task-flow/directExecution";
import type { DocumentLanguage } from "../../../application/services/task-flow/flowContracts";
import type { PromptTask } from "./unifiedPrompt";

const LANGUAGE_NAMES: Record<DocumentLanguage, string> = { "pt-BR": "Brazilian Portuguese (pt-BR)", en: "English" };
const DEFAULT_ROOT = "/workspace";

export function buildDirectPrompt(input: { language: DocumentLanguage; task: PromptTask; workspaceRoot?: string }) {
  const root = (input.workspaceRoot ?? DEFAULT_ROOT).replace(/\/$/, "");
  const outcomePath = `${root}/.flow-spec/${DIRECT_OUTCOME_FILE}`;
  return [
    `Use the ${DIRECT_SKILL_NAME} skill to implement GitHub issue #${input.task.issueNumber}: ${input.task.title}.`,
    `Planning classified this issue as DIRECT: implement it in the repository at ${root} following its existing patterns and project instructions, without writing a PRD, a TechSpec or task files.`,
    "Keep the change scoped to the issue. Ask through the runtime interaction mechanism only to clarify an already-defined requirement or to pick between low-risk local options. Do not invent product, domain, security, contract, lifecycle or persistent-data decisions.",
    "Run the narrowest checks that give real evidence for the change and fix failures that fall inside the issue scope. Never run commit, push, merge or publication commands.",
    `Before ending the turn, write ${outcomePath} with a first line \"status: <STATUS>\" where STATUS is one of ${DIRECT_OUTCOME_STATUSES.join(", ")}, and a second line \"reason: <one sentence>\". Use ROUTING_MISMATCH when the work needs a specification-level decision, BLOCKED when an environment, credential, dependency or tooling constraint stops it, and PARTIAL when in-scope work remains. Below those lines, report the changes and the checks you ran.`,
    `Write the report and every question in ${LANGUAGE_NAMES[input.language]}. Keep code identifiers, paths and the status value unchanged.`,
    "Issue body:",
    input.task.bodyMarkdown,
  ].join("\n\n");
}
