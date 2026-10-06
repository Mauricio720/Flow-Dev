"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/projects/contract";
import { BOARD_URL_EXAMPLE } from "../boardCopy";
import { useBoardEditor } from "../hooks/useBoardEditor";
import { BoardAuthorization } from "./BoardAuthorization";
import { BoardSummary } from "./BoardSummary";

const BOARD_URL_ID = "project-board-url";
const BOARD_NOTE_ID = `${BOARD_URL_ID}-note`;

export function BoardEditor({ project }: { project: Project }) {
  const editor = useBoardEditor(project);
  const saving = editor.status === "saving";
  function submit(event: FormEvent) {
    event.preventDefault();
    editor.submit();
  }
  return (
    <section aria-labelledby="settings-board" className="mt-10 flex flex-col gap-4">
      <h2 id="settings-board" className="text-[15px] font-semibold">Quadro do GitHub</h2>
      <BoardSummary board={editor.board} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={BOARD_URL_ID}>Link do GitHub Project</Label>
          <Input id={BOARD_URL_ID} type="url" inputMode="url" value={editor.url} disabled={saving} autoComplete="off" placeholder={BOARD_URL_EXAMPLE} aria-invalid={!!editor.feedback.message} aria-describedby={BOARD_NOTE_ID} onChange={(event) => editor.change(event.target.value)} />
          {editor.feedback.message ? <p id={BOARD_NOTE_ID} role="alert" className="text-sm text-destructive">{editor.feedback.message}</p> : <p id={BOARD_NOTE_ID} className="text-xs text-ink-3">O quadro precisa ter a opção Backlog no campo Status.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar quadro"}</Button>
          {editor.board && <Button type="button" variant="outline" disabled={saving} onClick={editor.unlink}>Desvincular quadro</Button>}
          {editor.status === "saved" && <p role="status" className="text-sm text-ink-2">{editor.board ? "Quadro salvo." : "Quadro desvinculado."}</p>}
        </div>
      </form>
      {editor.feedback.needsAuthorization && <BoardAuthorization projectId={project.id} />}
    </section>
  );
}
