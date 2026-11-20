"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloneHint } from "./compozyCopy";
import type { CompozyBindingEditorState } from "./useCompozyBindingEditor";

const CHECKOUT_PATH_ID = "project-compozy-checkout-path";
const CHECKOUT_NOTE_ID = `${CHECKOUT_PATH_ID}-note`;
const CHECKOUT_PLACEHOLDER = "/home/voce/projetos/app";

type Props = { editor: CompozyBindingEditorState; repository: string; bound: boolean };

export function CompozyBindingForm({ editor, repository, bound }: Props) {
  const verifying = editor.status === "verifying";
  function submit(event: FormEvent) {
    event.preventDefault();
    editor.submit();
  }
  return (
    <form onSubmit={submit} noValidate aria-busy={verifying} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={CHECKOUT_PATH_ID}>Pasta local do repositório</Label>
        <Input id={CHECKOUT_PATH_ID} value={editor.draft} disabled={verifying} autoComplete="off" spellCheck={false} placeholder={CHECKOUT_PLACEHOLDER} aria-invalid={!!editor.failure} aria-describedby={CHECKOUT_NOTE_ID} onChange={(event) => editor.change(event.target.value)} />
        {editor.failure ? <p id={CHECKOUT_NOTE_ID} role="alert" className="text-sm text-destructive">{editor.failure.message}</p> : <p id={CHECKOUT_NOTE_ID} className="text-xs text-ink-3">{cloneHint(repository)}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={verifying}>{verifying ? "Verificando…" : "Verificar e salvar"}</Button>
        {bound && <Button type="button" variant="outline" disabled={verifying} onClick={editor.recheck}>Verificar novamente</Button>}
        {editor.failure?.conflict && <Button type="button" variant="outline" onClick={() => void editor.reloadAfterConflict()}>Recarregar vínculo</Button>}
        {editor.status === "verified" && <p role="status" className="text-sm text-ink-2">Verificação concluída.</p>}
      </div>
    </form>
  );
}
