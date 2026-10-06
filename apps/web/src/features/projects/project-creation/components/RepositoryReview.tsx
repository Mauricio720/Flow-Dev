import Link from "next/link";
import { RepositoryFacts } from "@/components/projects/RepositoryFacts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectPath } from "@/lib/navigation/projectRoutes";
import type { RepositoryReviewer, ReviewedRepository } from "../hooks/useRepositoryReview";
import { GithubFailure } from "./GithubFailure";

function Confirmed({ reviewed, onChange }: { reviewed: ReviewedRepository; onChange: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RepositoryFacts repository={reviewed.repository} />
        <Button type="button" variant="ghost" size="sm" onClick={onChange}>Trocar repositório</Button>
      </div>
      {reviewed.linkedProjectId ? (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm leading-6 text-ink-2">
          <Badge variant="outline">Já vinculado</Badge>
          Este repositório já pertence a um projeto e não pode criar outro.
          <Link href={projectPath(reviewed.linkedProjectId)} className="underline">Abrir projeto existente</Link>
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-ink-2">O GitHub confirmou agora o acesso da sua conta e a identidade atual deste repositório.</p>
      )}
    </div>
  );
}

export function RepositoryReview({ reviewer }: { reviewer: RepositoryReviewer }) {
  const { state } = reviewer;
  if (state.status === "checking") return <p role="status" className="text-sm text-ink-3">Confirmando o repositório no GitHub…</p>;
  if (state.status === "confirmed") return <Confirmed reviewed={state.reviewed} onChange={reviewer.clear} />;
  if (state.status !== "failed") return null;
  return (
    <div className="flex flex-col gap-3">
      <GithubFailure code={state.code} onRetry={() => void reviewer.review(state.target)} />
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={reviewer.clear}>Escolher outro repositório</Button>
    </div>
  );
}
