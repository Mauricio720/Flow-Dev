import { PROJECTS_PATH, projectPath, projectWorkPath } from "./projectRoutes";

type Role = { isAdmin: boolean };

export function resolveHomeDestination(lastProjectId: string | null | undefined, authorizedProjectIds: string[], role: Role = { isAdmin: true }) {
  if (!lastProjectId || !authorizedProjectIds.includes(lastProjectId)) return PROJECTS_PATH;
  return role.isAdmin ? projectPath(lastProjectId) : projectWorkPath(lastProjectId);
}

export function retainProjectState(projectId: string, authorizedProjectIds: string[]) {
  return authorizedProjectIds.includes(projectId) ? projectId : null;
}
