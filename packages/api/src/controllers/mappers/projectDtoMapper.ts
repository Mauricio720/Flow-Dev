import type { ProjectRecord } from "../../application/database/dao/projectDao";

export function mapProjectDto(project: ProjectRecord) {
  return { id: project.id, name: project.name, description: project.description, isDemo: project.isDemo };
}
