import type { ProjectRecord } from "../../application/database/dao/projectDao";

export type ProjectDto = { id: string; name: string; description: string | null; repository: { githubId: string; nodeId: string; owner: string; name: string; visibility: string; archived: boolean; verifiedAt?: string }; detailsVersion: number; isDemo: boolean; board: { url: string; title: string } | null };

export function mapProjectDto(project: ProjectRecord) {
  if (!project.repository) return { id: project.id, name: project.name, description: project.description, isDemo: project.isDemo } as unknown as ProjectDto;
  return { id: project.id, name: project.name, description: project.description, repository: { ...project.repository, verifiedAt: project.repositoryVerifiedAt?.toISOString() }, detailsVersion: project.detailsVersion ?? 1, isDemo: project.isDemo, board: project.board ? { url: project.board.url, title: project.board.title } : null } satisfies ProjectDto;
}
