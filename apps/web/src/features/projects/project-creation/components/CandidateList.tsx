import { Button } from "@/components/ui/button";
import type { RepositoryCandidate } from "@/lib/projects/contract";
import type { RepositoryCandidates } from "../hooks/useRepositoryCandidates";
import { CandidateRow } from "./CandidateRow";

type Props = { candidates: RepositoryCandidates; onSelect: (candidate: RepositoryCandidate) => void };

function NoResults({ search }: { search: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-5 py-5">
      <h3 className="text-[15px] font-semibold">Nenhum resultado</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
        {search
          ? `Nenhum repositório acessível à sua conta corresponde a “${search}”. Confira o termo ou informe owner/nome diretamente.`
          : "Sua conta do GitHub não tem repositórios acessíveis a este aplicativo. Se o repositório é de uma organização, ela pode precisar aprovar o acesso."}
      </p>
    </div>
  );
}

export function CandidateList({ candidates, onSelect }: Props) {
  const { items, nextCursor, appliedSearch } = candidates;
  const empty = items.length === 0;
  if (empty && !nextCursor) return <NoResults search={appliedSearch} />;
  return (
    <div>
      {!empty && (
        <ul aria-label="Repositórios acessíveis" className="divide-y divide-line rounded-xl border border-line bg-raised">
          {items.map((candidate) => <CandidateRow key={candidate.repository.githubId} candidate={candidate} onSelect={onSelect} />)}
        </ul>
      )}
      {empty && <p className="text-sm leading-6 text-ink-2">Nenhum repositório neste lote corresponde à busca. Ainda há repositórios para verificar.</p>}
      {nextCursor && <Button type="button" variant="outline" className="mt-4" onClick={candidates.continueSearch}>{empty || appliedSearch ? "Continuar busca" : "Carregar mais repositórios"}</Button>}
    </div>
  );
}
