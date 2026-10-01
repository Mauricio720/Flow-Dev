import { getServerCaller } from "@/lib/trpc/server";
import { ProjectList } from "./components/ProjectList";

export async function ProjectCatalog() {
  const projects = await (await getServerCaller()).projects.list({});

  return (
    <section className="rounded-xl border border-foreground/10 p-5">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Projetos</h2>
        <span className="text-xs text-foreground/50">projects.list</span>
      </header>
      <ProjectList projects={projects} />
    </section>
  );
}
