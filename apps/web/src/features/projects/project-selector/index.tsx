import Link from "next/link";
import type { RouterOutputs } from "@flow-dev/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyProjects } from "./components/EmptyProjects";

type Page = RouterOutputs["projects"]["list"];

export function ProjectSelector({ page }: { page: Page }) {
  if (page.items.length === 0) return <EmptyProjects />;
  return (
    <section aria-labelledby="projects-title" className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-mono text-xs text-ink-3">CONTEXTO DO PROJETO</p>
      <h1 id="projects-title" className="mt-3 text-3xl font-semibold tracking-tight">
        Escolha um projeto
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
        Você só vê projetos atribuídos à sua conta. O contexto escolhido fica explícito na URL.
      </p>
      <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-raised">
        {page.items.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface"
            >
              <span>
                <span className="block font-medium">{project.name}</span>
                <span className="mt-1 block text-sm text-ink-2">{project.description ?? "Sem descrição"}</span>
              </span>
              {project.isDemo && (
                <Badge variant="outline" className="font-mono">
                  demo
                </Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {page.nextCursor && (
        <Button variant="outline" asChild className="mt-4">
          <Link href={`/projects?cursor=${encodeURIComponent(page.nextCursor)}`}>Carregar mais</Link>
        </Button>
      )}
    </section>
  );
}
