export const PROJECTS_PATH = "/projects";
export const PROJECT_CREATION_PATH = `${PROJECTS_PATH}/new`;
export const PROJECT_CREATED_PATH = `${PROJECTS_PATH}?criado=1`;
export const REVOKED_ACCESS_PATH = `${PROJECTS_PATH}?erro=acesso_revogado`;
const EXPIRED_SESSION_PATH = "/login?erro=sessao_expirada";
const SAFE_SEGMENT = "[0-9a-zA-Z_-]+";
const SAFE_RETURN_PATTERN = new RegExp(`^(\/settings\/local-machine\/pairing\/[A-Za-z0-9_-]{8}|/projects(/new|/${SAFE_SEGMENT}(/(issues|work)(/${SAFE_SEGMENT})?|/settings(/local-project)?)?)?)$`);
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

export function projectWorkPath(projectId: string) {
  return `${projectPath(projectId)}/work`;
}

export function projectWorkTaskPath(projectId: string, taskId: string) {
  return `${projectWorkPath(projectId)}/${taskId}`;
}

export function projectLocalProjectPath(projectId: string) {
  return `${projectSettingsPath(projectId)}/local-project`;
}

export function safeReturnPath(value: string | null | undefined, fallback: string) {
  if (!value || !SAFE_RETURN_PATTERN.test(value)) return fallback;
  return value;
}

export function expiredSessionPath(returnPath: string) {
  return `${EXPIRED_SESSION_PATH}&next=${encodeURIComponent(returnPath)}`;
}

export function repositoryConnectPath(returnPath: string) {
  return `/api/github-repositories/connect?returnTo=${encodeURIComponent(safeReturnPath(returnPath, PROJECTS_PATH))}`;
}
