"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import { CreationDetailsForm } from "./components/CreationDetailsForm";
import { RepositoryPicker } from "./components/RepositoryPicker";
import { RepositoryReview } from "./components/RepositoryReview";
import { useProjectCreation } from "./hooks/useProjectCreation";
import { useRepositoryCandidates } from "./hooks/useRepositoryCandidates";
import { useRepositoryReview, type ReviewState } from "./hooks/useRepositoryReview";

function Step({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="mb-4 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function creatableNodeId(state: ReviewState) {
  if (state.status !== "confirmed" || state.reviewed.linkedProjectId) return null;
  return state.reviewed.repository.nodeId;
}

export function ProjectCreation({ notice }: { notice: string | null }) {
  const candidates = useRepositoryCandidates();
  const reviewer = useRepositoryReview();
  const form = useProjectCreation();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader actions={<Button variant="ghost" size="sm" asChild><Link href={PROJECTS_PATH}>Voltar ao catálogo</Link></Button>} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Criar projeto</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-2">Um projeto aponta para um único repositório do GitHub, e esse vínculo não muda depois. Outro código pede outro projeto.</p>
        {notice && <p role="alert" className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink-2">{notice}</p>}
        <Step id="repository-step" title="1. Repositório">
          {reviewer.state.status === "idle" ? <RepositoryPicker candidates={candidates} onSelect={(candidate) => void reviewer.review({ nodeId: candidate.repository.nodeId })} onPreview={(owner, name) => void reviewer.review({ owner, name })} /> : <RepositoryReview reviewer={reviewer} />}
        </Step>
        <Step id="details-step" title="2. Detalhes">
          <CreationDetailsForm form={form} nodeId={creatableNodeId(reviewer.state)} />
        </Step>
      </main>
    </div>
  );
}
