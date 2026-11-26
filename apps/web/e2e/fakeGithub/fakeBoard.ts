export const FAKE_BOARD = {
  nodeId: "PVT_e2e_board",
  title: "Quadro E2E",
  url: "https://github.com/orgs/e2e/projects/1",
  statusFieldId: "PVTSSF_e2e_status",
  options: [
    { id: "e2e-backlog", name: "Backlog" },
    { id: "e2e-ready", name: "Ready" },
    { id: "e2e-in-progress", name: "In Progress" },
    { id: "e2e-done", name: "Done" },
  ],
};

export const IN_PROGRESS_OPTION_ID = "e2e-in-progress";

const TOKEN_PREFIX = "e2e-token-";

export function fakeAccessToken(githubId: string) {
  return `${TOKEN_PREFIX}${githubId}`;
}

export function githubIdFromAuthorization(header: string | undefined) {
  const token = header?.replace(/^Bearer\s+/i, "") ?? "";
  return token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
}

export function boardItemIdFor(taskId: string) {
  return `PVTI_${taskId}`;
}
