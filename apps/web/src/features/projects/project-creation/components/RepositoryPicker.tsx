import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RepositoryCandidate } from "@/lib/projects/contract";
import type { RepositoryCandidates } from "../hooks/useRepositoryCandidates";
import { CandidateList } from "./CandidateList";
import { DirectRepositoryInput } from "./DirectRepositoryInput";
import { GithubFailure } from "./GithubFailure";

const SEARCH_ID = "repository-search";
const SEARCH_MAX_LENGTH = 120;

type Props = { candidates: RepositoryCandidates; onSelect: (candidate: RepositoryCandidate) => void; onPreview: (owner: string, name: string) => void };

export function RepositoryPicker({ candidates, onSelect, onPreview }: Props) {
  const loading = candidates.status === "loading";
  return (
    <div aria-busy={loading}>
      <div role="search" className="mb-4 flex max-w-md flex-col gap-2">
        <Label htmlFor={SEARCH_ID} className="text-ink-3">Buscar repositório</Label>
        <Input id={SEARCH_ID} type="search" value={candidates.term} maxLength={SEARCH_MAX_LENGTH} autoComplete="off" placeholder="owner ou nome do repositório" onChange={(event) => candidates.setTerm(event.target.value)} />
      </div>
      {candidates.status === "failed" && <GithubFailure code={candidates.failureCode} onRetry={candidates.retry} />}
      {candidates.status === "ready" && <CandidateList candidates={candidates} onSelect={onSelect} />}
      {loading && <p role="status" className="text-sm text-ink-3">Consultando repositórios no GitHub…</p>}
      <DirectRepositoryInput onPreview={onPreview} />
    </div>
  );
}
