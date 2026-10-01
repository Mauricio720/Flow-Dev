export function resolveHomeDestination(lastProjectId: string | null | undefined, authorizedProjectIds: string[]) {
  if (lastProjectId && authorizedProjectIds.includes(lastProjectId)) return `/projects/${lastProjectId}`;
  return "/projects";
}

export function retainProjectState(projectId: string, authorizedProjectIds: string[]) {
  return authorizedProjectIds.includes(projectId) ? projectId : null;
}
