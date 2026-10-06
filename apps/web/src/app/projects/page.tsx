import { projectNotice } from "@/components/projects/connectionNotice";
import { ProjectCatalog } from "@/features/projects/project-catalog";
import { loadCatalog } from "@/features/projects/project-catalog/server/loadCatalog";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const [catalog, params] = await Promise.all([loadCatalog(), searchParams]);
  return <ProjectCatalog initial={catalog.initial} viewer={catalog.viewer} notice={projectNotice(params)} />;
}
