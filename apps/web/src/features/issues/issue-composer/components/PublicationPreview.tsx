import { TaskLabels } from "@/components/tasks/TaskLabels";
import { Button } from "@/components/ui/button";
import type { PreviewState } from "../hooks/usePublication";
import type { PublicationPreview as Preview } from "../publicationClient";
import { failureMessage } from "../taskCopy";
import { MarkdownPreview } from "./MarkdownPreview";

const EXACT_BODY_NOTE = "O corpo abaixo é o texto exato que será enviado ao GitHub. Conversa, fontes consultadas e diagnósticos não são publicados.";
const LABELS_NOTE = "As labels entram na Issue quando sua conta pode etiquetar o repositório. Sem essa permissão, o GitHub cria a Issue sem elas.";
const UNKNOWN_PUBLISHER = "sua conta do GitHub autorizada";

type Props = { state: PreviewState; preview: Preview | null; onRetry: () => void };

function PreviewFacts({ preview }: { preview: Preview }) {
  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="text-ink-3">Destino</dt>
      <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{preview.repositoryLabel}</dd>
      <dt className="text-ink-3">Criada por</dt>
      <dd className="[overflow-wrap:anywhere]">{preview.publisherLogin ? `@${preview.publisherLogin}` : UNKNOWN_PUBLISHER}</dd>
      <dt className="text-ink-3">Título</dt>
      <dd className="font-medium [overflow-wrap:anywhere]">{preview.title}</dd>
      <dt className="text-ink-3">Labels</dt>
      <dd><TaskLabels labels={preview.labels} /></dd>
    </dl>
  );
}

export function PublicationPreview({ state, preview, onRetry }: Props) {
  if (state.status === "loading") return <p role="status" className="border-t border-line px-5 py-4 text-sm text-ink-3">Preparando a prévia da publicação…</p>;
  if (state.status === "failed") {
    return (
      <div role="alert" className="space-y-3 border-t border-line px-5 py-4">
        <p className="text-sm text-destructive">{failureMessage(state.failure)}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>Tentar a prévia de novo</Button>
      </div>
    );
  }
  if (!preview) return null;
  return (
    <section aria-label="Prévia da publicação" className="space-y-3 border-t border-line px-5 py-4">
      <h4 className="text-sm font-semibold">Prévia da publicação</h4>
      <PreviewFacts preview={preview} />
      <MarkdownPreview body={preview.bodyMarkdown} label="Corpo da Issue renderizado" />
      <p className="text-xs text-ink-3">{EXACT_BODY_NOTE} {LABELS_NOTE}</p>
      <pre tabIndex={0} aria-label="Corpo da Issue em Markdown" className="max-h-80 overflow-auto rounded-md border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{preview.bodyMarkdown}</pre>
    </section>
  );
}
