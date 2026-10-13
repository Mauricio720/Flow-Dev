import { PULL_REQUEST_OUTCOME_FILE, PULL_REQUEST_OUTCOME_STATUSES } from "../../../application/services/local-execution/pullRequestOutcome";
import type { DocumentLanguage } from "../../../application/services/task-flow/flowContracts";
import { PULL_REQUEST_SKILL_NAME } from "../../../application/services/task-flow/pullRequestAction";
import type { PromptTask } from "./unifiedPrompt";

const LANGUAGE_NAMES: Record<DocumentLanguage, string> = { "pt-BR": "Brazilian Portuguese (pt-BR)", en: "English" };
const DEFAULT_ROOT = "/workspace";

export function buildPullRequestPrompt(input: { language: DocumentLanguage; task: PromptTask; workspaceRoot?: string }) {
  const root = (input.workspaceRoot ?? DEFAULT_ROOT).replace(/\/$/, "");
  const outcomePath = `${root}/.flow-spec/${PULL_REQUEST_OUTCOME_FILE}`;
  return [
    `Use the ${PULL_REQUEST_SKILL_NAME} skill to publish the finished work for GitHub issue #${input.task.issueNumber}: ${input.task.title}.`,
    `Implementation and Review already finished in the worktree at ${root}, on the branch that is checked out there. Split the pending changes into logical Conventional Commits, push that branch to origin and open one pull request against the repository default branch that closes issue #${input.task.issueNumber}.`,
    "Do not change source code, do not rewrite existing commits and never force-push, merge or delete branches. Never commit environment files, credentials or anything under .flow-spec or .compozy.",
    `Before ending the turn, write ${outcomePath} with a first line \"status: <STATUS>\" where STATUS is one of ${PULL_REQUEST_OUTCOME_STATUSES.join(", ")}. With OPENED add a line \"url: <pull request URL>\"; with BLOCKED add a line \"reason: <one sentence>\" naming what stopped the publication. Below those lines, list the commits you created.`,
    `Write the pull request title, its body and the report in ${LANGUAGE_NAMES[input.language]}. Write commit messages in the language the repository history already uses. Keep code identifiers, paths and the status value unchanged.`,
    "Issue body:",
    input.task.bodyMarkdown,
  ].join("\n\n");
}
