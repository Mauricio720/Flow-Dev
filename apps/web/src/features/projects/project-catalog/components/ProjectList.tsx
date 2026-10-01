import type { RouterOutputs } from "@flow-dev/api";

type Props = { projects: RouterOutputs["projects"]["list"] };

export function ProjectList({ projects }: Props) {
  if (projects.items.length === 0) return <p className="mt-4 text-sm text-foreground/50">Nenhum projeto ainda.</p>;

  return (
    <ul className="mt-4 divide-y divide-foreground/10">
      {projects.items.map((project) => (
        <li key={project.id} className="flex items-start justify-between gap-4 py-3">
          <div>
            <p className="font-medium">{project.name}</p>
            {project.description && <p className="text-sm text-foreground/60">{project.description}</p>}
          </div>
          {project.isDemo && <span className="shrink-0 font-mono text-xs text-foreground/50">demo</span>}
        </li>
      ))}
    </ul>
  );
}
