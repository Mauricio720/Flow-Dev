"use client";

import { useId } from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_SEARCH_CODE_POINTS, type TaskSummary } from "../contract";
import type { TaskHistory } from "../hooks/useTaskHistory";
import { HistoryEntry } from "./HistoryEntry";
import { HistoryStates } from "./HistoryStates";

const SEARCH_LABEL = "Buscar tarefas por título ou autor";

type Props = { history: TaskHistory; items: TaskSummary[]; activeId: string | null; canAuthor: boolean; onSelect: (taskId: string | null) => void };

function HistorySearch({ history }: { history: TaskHistory }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">{SEARCH_LABEL}</label>
      <Input id={id} type="search" value={history.term} placeholder={SEARCH_LABEL} aria-invalid={history.searchTooLong} aria-describedby={history.searchTooLong ? `${id}-limit` : undefined} onChange={(event) => history.setTerm(event.target.value)} className="h-9 text-sm" />
      {history.searchTooLong && <p id={`${id}-limit`} role="alert" className="mt-1.5 text-xs text-destructive">A busca aceita até {MAX_SEARCH_CODE_POINTS} caracteres. Encurte o texto para buscar.</p>}
    </div>
  );
}

export function SessionRail({ history, items, activeId, canAuthor, onSelect }: Props) {
  return (
    <nav aria-label="Intenções" className="flex h-full flex-col">
      <div className="space-y-2 p-3">
        {canAuthor && (
          <Button type="button" variant="secondary" onClick={() => onSelect(null)} aria-current={activeId === null ? "page" : undefined} className="w-full justify-start px-3">
            <PlusIcon />
            Nova intenção
          </Button>
        )}
        <HistorySearch history={history} />
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-2">
        <h2 className="text-xs font-medium text-ink-3">Tarefas do projeto</h2>
        <button type="button" onClick={() => void history.refresh()} className="text-xs text-ink-3 underline hover:text-ink">Atualizar</button>
      </div>
      <div aria-busy={history.status === "loading"} className="relative flex-1 overflow-y-auto px-2 pb-4">
        {items.length > 0 && (
          <ul aria-label="Tarefas salvas" className="relative">
            <span aria-hidden="true" className="absolute top-2 bottom-6 left-[19px] w-px bg-line" />
            {items.map((task) => <HistoryEntry key={task.id} task={task} active={task.id === activeId} onSelect={onSelect} />)}
          </ul>
        )}
        <HistoryStates history={history} />
      </div>
    </nav>
  );
}
