import Link from "next/link";
import { RepositoryFacts } from "@/components/projects/RepositoryFacts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectPath } from "@/lib/navigation/projectRoutes";
import type { RepositoryCandidate } from "@/lib/projects/contract";

type Props = { candidate: RepositoryCandidate; onSelect: (candidate: RepositoryCandidate) => void };

export function CandidateRow({ candidate, onSelect }: Props) {
  const label = `${candidate.repository.owner}/${candidate.repository.name}`;
  return (
    <li className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2.5">
      <RepositoryFacts repository={candidate.repository} />
      {candidate.linkedProjectId ? (
        <span className="flex items-center gap-3">
          <Badge variant="outline">Já vinculado</Badge>
          <Link href={projectPath(candidate.linkedProjectId)} className="text-sm underline">Abrir projeto</Link>
          <Button type="button" variant="outline" size="sm" disabled aria-label={`Selecionar ${label}`}>Selecionar</Button>
        </span>
      ) : (
        <Button type="button" variant="outline" size="sm" aria-label={`Selecionar ${label}`} onClick={() => onSelect(candidate)}>Selecionar</Button>
      )}
    </li>
  );
}
