const TASK_ID_PREFIX_LENGTH = 8;
const IDENTIFIER_PREFIX = "FD-";
const BRANCH_PREFIX = "flow-dev/";
const WORK_SUFFIX = "-impl";

export type ExecutionNameInput = { taskId: string; projectKey: string; issue: { number: number } };

export function executionSlug(input: ExecutionNameInput) {
  return `${input.projectKey}-${input.issue.number}-${input.taskId.slice(0, TASK_ID_PREFIX_LENGTH)}`;
}

export function executionNames(input: ExecutionNameInput) {
  const slug = executionSlug(input);
  return { workIdentifier: IDENTIFIER_PREFIX + slug + WORK_SUFFIX, branch: BRANCH_PREFIX + slug };
}
