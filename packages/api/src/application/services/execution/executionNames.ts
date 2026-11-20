const TASK_ID_PREFIX_LENGTH = 8;
const IDENTIFIER_PREFIX = "FD-";
const BRANCH_PREFIX = "flow-dev/";
const WORK_SUFFIX = "-impl";
const SPEC_SUFFIX = "-spec";
const DELIVERY_SUFFIX = "-delivery";
const SPEC_WORKTREE_PREFIX = "fd-";
const SPEC_DIRECTORY = ".compozy/tasks/";

export type ExecutionNameInput = { taskId: string; projectKey: string; issue: { number: number } };

export function executionSlug(input: ExecutionNameInput) {
  return `${input.projectKey}-${input.issue.number}-${input.taskId.slice(0, TASK_ID_PREFIX_LENGTH)}`;
}

export function executionNames(input: ExecutionNameInput) {
  const slug = executionSlug(input);
  const branch = BRANCH_PREFIX + slug;
  return {
    workIdentifier: IDENTIFIER_PREFIX + slug + WORK_SUFFIX,
    specIdentifier: IDENTIFIER_PREFIX + slug + SPEC_SUFFIX,
    deliveryIdentifier: IDENTIFIER_PREFIX + slug + DELIVERY_SUFFIX,
    branch,
    specBranch: branch + SPEC_SUFFIX,
    specWorktreeName: SPEC_WORKTREE_PREFIX + slug + SPEC_SUFFIX,
    specDir: SPEC_DIRECTORY + SPEC_WORKTREE_PREFIX + slug,
  };
}
