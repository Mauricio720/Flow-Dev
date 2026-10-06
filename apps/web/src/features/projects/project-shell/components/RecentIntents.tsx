import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { TASK_STATUS_INK, TASK_STATUS_LABEL, TASK_STATUS_NODE } from "@/components/tasks/taskStatus";
import { projectIssuesPath, projectTaskPath } from "@/lib/navigation/projectRoutes";
import type { TaskSummary } from "@/lib/tasks/contract";
import { cn } from "@/lib/utils";
import type { RecentTasksLoad } from "../server/loadRecentTasks";
import { OverviewPanel } from "./OverviewPanel";

const UNTITLED = "Tarefa sem título";
const UNKNOWN_AUTHOR = "Autoria não identificada";

type Props = { projectId: string; recent: RecentTasksLoad };

function IntentRow({ task }: { task: TaskSummary }) {
  return (
    <li>
      <Link href={projectTaskPath(task.projectId, task.id)} className="relative flex items-center gap-4 rounded-lg py-2.5 pr-3 pl-10 transition-colors duration-200 ease-out-expo hover:bg-accent">
        <span aria-hidden="true" className={cn("absolute top-1/2 left-5 size-2.5 -translate-x-1/2 -translate-y-1/2", TASK_STATUS_NODE[task.status])} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{task.title || UNTITLED}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-3">{task.authorName ?? UNKNOWN_AUTHOR}</span>
        </span>
        <span className={cn("shrink-0 text-xs", TASK_STATUS_INK[task.status])}>{TASK_STATUS_LABEL[task.status]}</span>
      </Link>
    </li>
  );
}

function IntentList({ projectId, recent }: Props) {
  if (recent.kind === "failed") return <p className="px-5 py-6 text-sm leading-6 text-ink-2">Não foi possível carregar as intenções agora. Abra Issues para tentar de novo.</p>;
  if (recent.items.length === 0) {
    return (
      <div className="px-5 py-8">
        <p className="text-sm font-medium">Nenhuma intenção ainda</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-ink-2">Descreva uma mudança ao Issue Author. Ele consulta o repositório e devolve um draft de Issue para você revisar.</p>
        <Link href={projectIssuesPath(projectId)} className="mt-3 inline-block text-sm font-medium underline">Descrever a primeira mudança</Link>
      </div>
    );
  }
  return (
    <ul aria-label="Intenções recentes" className="relative p-2">
      <span aria-hidden="true" className="absolute top-6 bottom-6 left-7 w-px bg-line" />
      {recent.items.map((task) => <IntentRow key={task.id} task={task} />)}
    </ul>
  );
}

export function RecentIntents({ projectId, recent }: Props) {
  const seeAll = <Link href={projectIssuesPath(projectId)} className="flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink">Ver todas<ChevronRightIcon size={14} /></Link>;
  return (
    <OverviewPanel id="recent-intents-title" title="Intenções recentes" action={seeAll}>
      <IntentList projectId={projectId} recent={recent} />
    </OverviewPanel>
  );
}
