import { redirect } from "next/navigation";
import { IssueComposer } from "@/features/issues/issue-composer";
import { getAuthSession } from "@/lib/auth/session";
import { getServerCaller } from "@/lib/trpc/server";

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  if (!(await getAuthSession())) redirect("/login?erro=sessao_expirada");
  const { projectId } = await params;
  let project;
  try { project = await (await getServerCaller()).projects.byId({ projectId }); } catch { redirect("/projects"); }
  return <IssueComposer projectId={project.id} projectName={project.name} />;
}
