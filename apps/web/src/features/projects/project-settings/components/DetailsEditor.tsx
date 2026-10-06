"use client";

import type { FormEvent } from "react";
import { ProjectDetailsFields } from "@/components/projects/ProjectDetailsFields";
import { Button } from "@/components/ui/button";
import { TRPC_BAD_REQUEST, TRPC_FORBIDDEN, type Project } from "@/lib/projects/contract";
import type { ProjectFailure } from "@/lib/projects/projectFailure";
import { useDetailsEditor } from "../hooks/useDetailsEditor";
import { ChangedDetailsReview } from "./ChangedDetailsReview";

const FORBIDDEN_MESSAGE = "Sua conta não pode mais editar este projeto. Nada foi alterado.";
const GENERIC_MESSAGE = "Não foi possível salvar agora. Os detalhes salvos continuam os mesmos; tente de novo.";

function failureMessage(failure: ProjectFailure | null, reviewing: boolean) {
  if (!failure || reviewing || failure.code === TRPC_BAD_REQUEST) return null;
  return failure.code === TRPC_FORBIDDEN ? FORBIDDEN_MESSAGE : GENERIC_MESSAGE;
}

export function DetailsEditor({ project }: { project: Project }) {
  const editor = useDetailsEditor(project);
  const message = failureMessage(editor.failure, !!editor.changed);
  function submit(event: FormEvent) {
    event.preventDefault();
    editor.submit();
  }
  return (
    <form onSubmit={submit} noValidate aria-labelledby="settings-details" className="mt-10 flex flex-col gap-6">
      <h2 id="settings-details" className="text-[15px] font-semibold">Nome e descrição</h2>
      <ProjectDetailsFields values={editor.draft} errors={editor.fieldErrors} disabled={editor.status === "saving"} onChange={editor.change} />
      {editor.changed && <ChangedDetailsReview changed={editor.changed} onReview={editor.review} />}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={editor.status === "saving" || !!editor.changed}>{editor.status === "saving" ? "Salvando…" : "Salvar detalhes"}</Button>
        {editor.status === "saved" && <p role="status" className="text-sm text-ink-2">Detalhes salvos.</p>}
      </div>
    </form>
  );
}
