import type { Metadata } from "next";
import { projectNotice } from "@/components/projects/connectionNotice";
import { ProjectCreation } from "@/features/projects/project-creation";
import { requireAdministrator } from "@/features/projects/project-creation/server/requireAdministrator";
import { PROJECT_CREATION_PATH } from "@/lib/navigation/projectRoutes";

export const metadata: Metadata = { title: "Criar projeto · Flow Dev" };

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  await requireAdministrator(PROJECT_CREATION_PATH);
  return <ProjectCreation notice={projectNotice(await searchParams)} />;
}
