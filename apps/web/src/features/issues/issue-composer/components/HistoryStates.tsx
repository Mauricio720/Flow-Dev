import { Button } from "@/components/ui/button";
import type { TaskHistory } from "../hooks/useTaskHistory";
import { failureMessage } from "../taskCopy";

const EMPTY_HISTORY = "Nenhuma tarefa salva neste projeto ainda. Use “Nova intenção” para descrever a primeira.";
const FAILURE_NOTE = "Isso não significa que o projeto está sem tarefas.";

export function HistoryStates({ history }: { history: TaskHistory }) {
  const ready = history.status === "ready";
  const empty = ready && history.items.length === 0;
  return (
    <div className="space-y-3 px-2 pt-2 text-xs leading-relaxed text-ink-3">
      {history.status === "failed" && history.failure && (
        <div role="alert" className="space-y-2">
          <p className="font-medium text-destructive">Não foi possível carregar as tarefas.</p>
          <p>{failureMessage(history.failure)} {FAILURE_NOTE}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void history.retry()}>Tentar novamente</Button>
        </div>
      )}
      {empty && !history.appliedSearch && <p>{EMPTY_HISTORY}</p>}
      {empty && history.appliedSearch && (
        <div className="space-y-2">
          <p>Nenhuma tarefa encontrada para “{history.appliedSearch}”.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => history.setTerm("")}>Limpar busca</Button>
        </div>
      )}
      {ready && history.nextCursor && <Button type="button" variant="outline" size="sm" onClick={() => void history.loadMore()}>Carregar mais tarefas</Button>}
      {history.status === "loading" && <p role="status">Carregando tarefas…</p>}
    </div>
  );
}
