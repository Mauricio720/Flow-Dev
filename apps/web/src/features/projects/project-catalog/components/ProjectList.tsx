import type { RouterOutputs } from "@flow-dev/api";
import { Badge } from "@/components/ui/badge";

type Props = { projects: RouterOutputs["projects"]["list"] };

export function ProjectList({ projects }: Props) {
  if (projects.items.length === 0) return <p className="mt-4 text-sm text-ink-3">Nenhum projeto ainda.</p>;

  return (
    <ul className="mt-4 divide-y divide-line">
      {projects.items.map((project) => (
        <li key={project.id} className="flex items-start justify-between gap-4 py-3">
          <div>
            <p className="font-medium">{project.name}</p>
            {project.description && <p className="text-sm text-ink-2">{project.description}</p>}
          </div>
          {project.isDemo && (
            <Badge variant="outline" className="shrink-0 font-mono">
              demo
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
