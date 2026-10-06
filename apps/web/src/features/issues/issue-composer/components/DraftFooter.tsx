import { useId } from "react";
import { CheckIcon, GitHubMark, PencilIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { SaveState } from "../hooks/useDraftActions";
import { PUBLISH_BLOCK_COPY, canReview, isFrozen, type PublishBlock } from "../reviewGate";
import { failureMessage } from "../taskCopy";

const APPROVAL_NOTE = "Nada é publicado até você aprovar.";
const REVIEWED_NOTE = "Publicação revisada. Confira a prévia acima e crie a Issue.";
const SAVE_FAILED_NOTE = "As alterações continuam aqui e ainda não foram salvas.";

type Props = {
  block: PublishBlock | null;
  saveState: SaveState;
  editing: boolean;
  dirty: boolean;
  reviewing: boolean;
  onToggleEditing: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onReview: () => void;
  onPublish: () => void;
};

function SaveIndicator({ saveState }: { saveState: SaveState }) {
  if (saveState.status === "saving") return <p role="status" className="text-sm text-ink-3">Salvando…</p>;
  if (saveState.status === "saved") return <p role="status" className="text-sm text-ink-3">Alterações salvas.</p>;
  if (saveState.status === "failed") return <p role="alert" className="text-sm text-destructive">{failureMessage(saveState.failure)} {SAVE_FAILED_NOTE}</p>;
  return <p className="text-sm text-ink-3">{APPROVAL_NOTE}</p>;
}

function EditActions({ editing, dirty, saving, onToggleEditing, onSave, onDiscard }: Pick<Props, "editing" | "dirty" | "onToggleEditing" | "onSave" | "onDiscard"> & { saving: boolean }) {
  return (
    <>
      <Button type="button" variant="secondary" disabled={saving} onClick={onToggleEditing}>{editing ? <CheckIcon /> : <PencilIcon />}{editing ? "Concluir edição" : "Editar"}</Button>
      {dirty && <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}>Descartar alterações</Button>}
      {dirty && <Button type="button" disabled={saving} onClick={onSave}>Salvar</Button>}
    </>
  );
}

function ReviewAction({ block, reviewing, onReview }: Pick<Props, "block" | "reviewing" | "onReview">) {
  if (reviewing) return <Button type="button" variant="secondary" disabled aria-busy="true">Preparando prévia…</Button>;
  const reviewed = block === null;
  return <Button type="button" variant={reviewed ? "ghost" : "secondary"} disabled={!canReview(block)} onClick={onReview}>{reviewed ? "Revisar de novo" : "Revisar publicação"}</Button>;
}

export function DraftFooter({ block, saveState, editing, dirty, reviewing, onToggleEditing, onSave, onDiscard, onReview, onPublish }: Props) {
  const gateId = useId();
  const locked = isFrozen(block);
  const publishing = block === "publishing";
  return (
    <footer className="space-y-3 border-t border-line bg-surface px-5 py-3.5">
      <SaveIndicator saveState={saveState} />
      {block ? <p id={gateId} className="text-sm text-ink-2">{PUBLISH_BLOCK_COPY[block]}</p> : <p role="status" className="flex items-center gap-2 text-sm font-medium text-merge-ink"><CheckIcon />{REVIEWED_NOTE}</p>}
      <div className="flex flex-wrap gap-2">
        {!locked && <EditActions editing={editing} dirty={dirty} saving={saveState.status === "saving"} onToggleEditing={onToggleEditing} onSave={onSave} onDiscard={onDiscard} />}
        {!locked && <ReviewAction block={block} reviewing={reviewing} onReview={onReview} />}
        <Button type="button" variant="publish" disabled={block !== null} aria-busy={publishing} aria-describedby={block ? gateId : undefined} onClick={onPublish} className="font-semibold disabled:opacity-60">
          {publishing ? <span className="node-running size-2 rounded-full bg-on-merge" aria-hidden="true" /> : <GitHubMark size={15} />}
          {publishing ? "Publicando…" : "Criar Issue"}
        </Button>
      </div>
    </footer>
  );
}
