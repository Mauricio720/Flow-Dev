import { ArrowUpRightIcon, CheckIcon, GitHubMark, PencilIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { REPO, type ThreadItem } from "../model";

type DraftStatus = Extract<ThreadItem, { kind: "draft" }>["status"];

type Props = {
  status: DraftStatus;
  error: string | null;
  editing: boolean;
  locked: boolean;
  onToggleEditing: () => void;
  onPublish: () => void;
};

function PublishedActions() {
  return (
    <>
      <p className="flex items-center gap-2 text-sm text-merge-ink">
        <CheckIcon />
        Publicada em {REPO}
      </p>
      <Button variant="ghost" size="sm" asChild className="self-start text-ink hover:text-ink sm:self-auto">
        <a href="https://github.com" target="_blank" rel="noreferrer">
          Abrir no GitHub <ArrowUpRightIcon size={14} />
        </a>
      </Button>
    </>
  );
}

export function DraftFooter({ status, error, editing, locked, onToggleEditing, onPublish }: Props) {
  return (
    <footer className="flex flex-col gap-3 border-t border-line bg-surface px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      {status === "published" ? (
        <PublishedActions />
      ) : (
        <>
          <p className={`text-sm ${error ? "text-destructive" : "text-ink-3"}`} role={error ? "alert" : undefined}>
            {error ?? (status === "publishing" ? "Enviando para o GitHub…" : "Nada é publicado até você aprovar.")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={locked}
              onClick={onToggleEditing}
              className="flex-1 disabled:opacity-50 sm:flex-none"
            >
              {editing ? <CheckIcon /> : <PencilIcon />}
              {editing ? "Concluir edição" : "Editar"}
            </Button>
            <Button
              type="button"
              variant="publish"
              disabled={locked}
              aria-busy={status === "publishing"}
              onClick={onPublish}
              className="flex-1 font-semibold disabled:cursor-progress disabled:opacity-100 sm:flex-none"
            >
              {status === "publishing" ? (
                <span className="node-running size-2 rounded-full bg-on-merge" aria-hidden="true" />
              ) : (
                <GitHubMark size={15} />
              )}
              {status === "publishing" ? "Publicando…" : "Criar Issue"}
            </Button>
          </div>
        </>
      )}
    </footer>
  );
}
