import Link from "next/link";
import type { ReactNode } from "react";
import { projectPath } from "@/lib/navigation/projectRoutes";
import { TRPC_BAD_REQUEST, TRPC_CONFLICT } from "@/lib/projects/contract";
import type { ProjectFailure } from "@/lib/projects/projectFailure";
import { isGithubFailure } from "../failureCopy";
import { GithubFailure } from "./GithubFailure";

function Outcome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-raised px-5 py-5">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <div className="mt-2 max-w-xl text-sm leading-6 text-ink-2">{children}</div>
    </div>
  );
}

function ConflictOutcome({ existingProjectId }: { existingProjectId?: string }) {
  if (!existingProjectId) return null;
  return (
    <Outcome title="Este repositório já está vinculado a um projeto">
      <p>Nenhum projeto novo foi criado. Se você acabou de enviar este formulário, o projeto existente é o seu.</p>
      <Link href={projectPath(existingProjectId)} className="mt-3 inline-block underline">Abrir projeto existente</Link>
    </Outcome>
  );
}

export function CreationOutcome({ failure }: { failure: ProjectFailure | null }) {
  if (!failure || failure.code === TRPC_BAD_REQUEST) return null;
  if (failure.code === TRPC_CONFLICT) return <ConflictOutcome existingProjectId={failure.existingProjectId} />;
  if (isGithubFailure(failure.code)) return <GithubFailure code={failure.code} />;
  return (
    <Outcome title="Não foi possível confirmar a criação">
      <p>A resposta não chegou. Envie de novo com os mesmos dados: se o projeto já tiver sido criado, você recebe o link para ele em vez de uma cópia.</p>
    </Outcome>
  );
}
