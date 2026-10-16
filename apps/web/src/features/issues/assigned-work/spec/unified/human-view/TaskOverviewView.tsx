import { COVERS_LABEL, dependencyLabel, NO_DEPENDENCIES, OVERVIEW_EMPTY, OVERVIEW_TITLES, UNKNOWN_DEPENDENCIES } from "./overviewCopy";
import type { OpenSource, SourcedText, TaskCard, TasksOverview } from "./overviewTypes";
import { InlineText, OverviewHeading, SourceLink } from "./OverviewText";

type Handlers = { onOpenSource: OpenSource; onOpenDocument: (path: string) => void };
type Props = Handlers & { overview: TasksOverview };

function Note({ title, text, onOpenSource, onOpenDocument }: Handlers & { title: string; text: SourcedText | null }) {
  if (!text) return null;
  return (
    <section aria-label={title} className="space-y-2">
      <OverviewHeading title={title} />
      <p className="max-w-[65ch] text-[15px] leading-7 text-ink"><InlineText text={text.text} onOpenDocument={onOpenDocument} /></p>
      <SourceLink source={text.source} onOpen={onOpenSource} />
    </section>
  );
}

function TaskRow({ task, graphKnown, onOpenSource, onOpenDocument }: Handlers & { task: TaskCard; graphKnown: boolean }) {
  const dependencies = task.dependsOn.length > 0 ? dependencyLabel(task.dependsOn) : NO_DEPENDENCIES;
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full border border-line font-mono text-xs text-ink-2 tabular-nums">{task.number}</span>
      <div className="min-w-0 space-y-1">
        <h6 className="text-[15px] leading-6 font-semibold text-ink"><span className="sr-only">Tarefa {task.number}: </span><InlineText text={task.title} /></h6>
        {task.meta.length > 0 && <p className="text-xs text-ink-3">{task.meta.join(" · ")}</p>}
        {task.detail[0] && <p className="max-w-[65ch] text-sm leading-6 text-ink-2"><InlineText text={task.detail[0]} onOpenDocument={onOpenDocument} /></p>}
        {graphKnown && <p className="text-xs text-ink-2">{dependencies}</p>}
        {task.covers.length > 0 && <p className="text-xs text-ink-2"><span className="text-ink-3">{COVERS_LABEL} </span><span className="font-mono">{task.covers.join(", ")}</span></p>}
        <SourceLink source={task.source} onOpen={onOpenSource} />
      </div>
    </li>
  );
}

export function TaskOverviewView({ overview, ...handlers }: Props) {
  return (
    <div className="space-y-6">
      <Note title={OVERVIEW_TITLES.delivery} text={overview.outcome} {...handlers} />
      <section aria-label={OVERVIEW_TITLES.tasks} className="space-y-3 border-t border-line pt-6 first:border-t-0 first:pt-0">
        <OverviewHeading title={OVERVIEW_TITLES.tasks} count={overview.tasks.length} />
        {!overview.graphKnown && overview.tasks.length > 0 && <p className="text-sm text-ink-3">{UNKNOWN_DEPENDENCIES}</p>}
        {overview.tasks.length > 0 ? <ol className="divide-y divide-line">{overview.tasks.map((task) => <TaskRow key={task.id} task={task} graphKnown={overview.graphKnown} {...handlers} />)}</ol> : <p className="text-sm text-ink-3">{OVERVIEW_EMPTY.tasks}</p>}
      </section>
      <Note title={OVERVIEW_TITLES.coverage} text={overview.coverage} {...handlers} />
    </div>
  );
}
