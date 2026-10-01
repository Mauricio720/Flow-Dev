import { redirect } from "next/navigation";
import { ProjectSelector } from "@/features/projects/project-selector";
import { getAuthSession } from "@/lib/auth/session";
import { getServerCaller } from "@/lib/trpc/server";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  if (!(await getAuthSession())) redirect("/login?erro=sessao_expirada");
  const { cursor } = await searchParams;
  let page;
  try { page = await (await getServerCaller()).projects.list({ cursor: typeof cursor === "string" ? cursor : undefined }); } catch { redirect("/login?erro=falha_temporaria"); }
  return <ProjectSelector page={page} />;
}
