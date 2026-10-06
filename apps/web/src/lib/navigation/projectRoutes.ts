export const PROJECTS_PATH = "/projects";
export const PROJECT_CREATION_PATH = `${PROJECTS_PATH}/new`;
export const PROJECT_CREATED_PATH = `${PROJECTS_PATH}?criado=1`;
export const REVOKED_ACCESS_PATH = `${PROJECTS_PATH}?erro=acesso_revogado`;
const EXPIRED_SESSION_PATH = "/login?erro=sessao_expirada";
const TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function projectPath(projectId: string) {
  return `${PROJECTS_PATH}/${projectId}`;
}

export function projectIssuesPath(projectId: string) {
  return `${projectPath(projectId)}/issues`;
}

export function isTaskId(value: string) {
  return TASK_ID_PATTERN.test(value);
}

export function projectTaskPath(projectId: string, taskId: string) {
  return `${projectIssuesPath(projectId)}/${taskId}`;
}

export function taskIdFromPath(projectId: string, pathname: string) {
  const prefix = `${projectIssuesPath(projectId)}/`;
  const candidate = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  return isTaskId(candidate) ? candidate : null;
}

export function projectSettingsPath(projectId: string) {
  return `${projectPath(projectId)}/settings`;
}

export function expiredSessionPath(returnPath: string) {
  return `${EXPIRED_SESSION_PATH}&next=${encodeURIComponent(returnPath)}`;
}

export function repositoryConnectPath(returnPath: string) {
  return `/api/github-repositories/connect?returnTo=${encodeURIComponent(returnPath)}`;
}
