"use client";

import type { ReactNode } from "react";
import { BranchIcon, GitHubMark, LockIcon } from "@/components/icons";
import { ConnectionStateLabel } from "@/components/projects/ConnectionStateLabel";
import { CONNECTION_PRESENTATION } from "@/components/projects/connectionPresentation";
import { visibilityLabel } from "@/components/projects/RepositoryFacts";
import { repositoryLabel } from "@/components/projects/RepositoryIdentity";
import type { ConnectionKind, Project } from "@/lib/projects/contract";
import { cn } from "@/lib/utils";
import { useRepositoryContext } from "../hooks/useRepositoryContext";
import { useProjectConnection } from "../projectConnection";
import { ConnectionActions, hasConnectionAction } from "./ConnectionActions";

const READABLE: ConnectionKind[] = ["available", "archived"];
const ARCHIVED_NOTE = "Arquivado no GitHub";

type FactProps = { label: string; icon: ReactNode; tone: string; children: ReactNode };

function Fact({ label, icon, tone, children }: FactProps) {
  return (
    <div className="flex gap-3.5 bg-raised p-5">
      <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs text-ink-3">{label}</h3>
        <div className="mt-1 min-w-0 text-[15px]">{children}</div>
      </div>
    </div>
  );
}

function RepositoryFact({ project, defaultBranch }: { project: Project; defaultBranch: string | null }) {
  return (
    <Fact label="Repositório" icon={<BranchIcon size={18} />} tone="bg-project-wash text-project-ink">
      <p className="font-mono text-[13px] [overflow-wrap:anywhere]">{repositoryLabel(project)}</p>
      {defaultBranch && <p className="mt-1.5 text-xs text-ink-3">Branch padrão <span className="font-mono text-ink-2">{defaultBranch}</span></p>}
    </Fact>
  );
}

export function RepositoryPanel({ project }: { project: Project }) {
  const connection = useProjectConnection();
  const defaultBranch = useRepositoryContext(project.id, READABLE.includes(connection.kind));
  return (
    <section aria-labelledby="repository-title" className="mt-8">
      <h2 id="repository-title" className="sr-only">Repositório do projeto</h2>
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.5fr)]">
        <RepositoryFact project={project} defaultBranch={defaultBranch} />
        <Fact label="Visibilidade" icon={<LockIcon size={18} />} tone="bg-ground text-ink-2 ring-1 ring-line">
          <p>{visibilityLabel(project.repository?.visibility)}</p>
          {project.repository?.archived && <p className="mt-1.5 text-xs text-ink-3">{ARCHIVED_NOTE}</p>}
        </Fact>
        <Fact label="Seu acesso" icon={<GitHubMark size={17} />} tone="bg-github-wash text-github-ink">
          <ConnectionStateLabel kind={connection.kind} className="text-sm" />
          <p className="mt-1.5 text-sm leading-6 text-ink-2">{CONNECTION_PRESENTATION[connection.kind].detail}</p>
        </Fact>
        {hasConnectionAction(connection.kind) && (
          <div className="bg-surface px-5 py-4 lg:col-span-3">
            <ConnectionActions projectId={project.id} kind={connection.kind} onRecheck={connection.recheck} />
          </div>
        )}
      </div>
    </section>
  );
}
