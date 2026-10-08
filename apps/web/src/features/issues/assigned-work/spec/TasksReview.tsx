"use client";

import { useState } from "react";
import type { ReviewDiagnostic } from "@flow-dev/api/spec";
import { Button } from "@/components/ui/button";
import type { SpecPackageDetail } from "./specContract";
import { INCOMPLETE_PACKAGE } from "./specCopy";
import { SpecDiagnostics } from "./SpecDiagnostics";
import { documentAt } from "./specReviewContext";
import { sliceSource } from "./specSource";
import type { LoadedDocument } from "./useSpecPackage";

const PAGE_SIZE = 10;
type Ref = { startByte: number; endByte: number };
type Task = { id: string; title: string; path: string; dependsOn: string[]; testIds: string[]; scope: Ref; acceptance: Ref };
type Props = { detail: SpecPackageDetail; documents: LoadedDocument[] };

function TaskCard({ task, source }: { task: Task; source: string }) {
  return (
    <li className="space-y-2 rounded-md border border-line px-3 py-3">
      <h4 className="text-[15px] font-semibold">{task.id} · {task.title}</h4>
      <p className="text-sm text-ink-2">Depende de: {task.dependsOn.length ? task.dependsOn.join(", ") : "nenhuma tarefa"}</p>
      <pre className="whitespace-pre-wrap text-sm">{sliceSource(source, task.scope.startByte, task.scope.endByte)}</pre>
      <p className="text-sm"><strong>Validação atribuída:</strong> {task.testIds.length ? task.testIds.join(", ") : "nenhum teste atribuído"}</p>
      <pre className="whitespace-pre-wrap text-sm text-ink-2">{sliceSource(source, task.acceptance.startByte, task.acceptance.endByte)}</pre>
    </li>
  );
}

export function TasksReview({ detail, documents }: Props) {
  const [page, setPage] = useState(0);
  const manifest = documentAt(documents, "_tasks.md");
  const tasks = detail.relations.tasks as Task[];
  if (!manifest || tasks.length === 0) return <p role="alert" className="text-sm text-destructive">{INCOMPLETE_PACKAGE}</p>;
  const diagnostics = detail.diagnostics as ReviewDiagnostic[];
  const graphInvalid = diagnostics.some((item) => item.severity === "blocking" && ["missing_dependency", "dependency_cycle", "duplicate_task", "missing_task_file"].includes(item.code));
  const visible = tasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <div className="space-y-4">
      <SpecDiagnostics diagnostics={diagnostics} />
      {graphInvalid && <p role="alert" className="text-sm text-destructive">O grafo de dependências não é válido.</p>}
      <ul aria-label="Tarefas" className="space-y-3">{visible.map((task) => <TaskCard key={task.id} task={task} source={documentAt(documents, task.path)?.sourceText ?? ""} />)}</ul>
      <nav aria-label="Paginação das tarefas" className="flex items-center gap-3 text-sm">
        <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span>{`Página ${page + 1} de ${Math.ceil(tasks.length / PAGE_SIZE)}`}</span>
        <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= tasks.length} onClick={() => setPage(page + 1)}>Próxima</Button>
      </nav>
    </div>
  );
}
