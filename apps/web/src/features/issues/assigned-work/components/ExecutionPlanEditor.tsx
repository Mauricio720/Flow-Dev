"use client";

import type { TaskDetail } from "../contract";
import { useExecutionPlan } from "../hooks/useExecutionPlan";
import { planEditHandlers } from "../planEditHandlers";
import { assignedIds } from "../planEditorModel";
import { PLAN_HEADING, PLAN_LIST_LABEL, STALE_NOTICE, sessionCountText } from "../planCopy";
import type { TaskSetData } from "../taskSetContract";
import type { AgentOption, TerminalScope } from "../terminalContract";
import { PlanFolderChange } from "./PlanFolderChange";
import { PlanSaveBar } from "./PlanSaveBar";
import { PlanSessionCard } from "./PlanSessionCard";
import { PlanSessionFooter } from "./PlanSessionFooter";
import { PlanShortcuts } from "./PlanShortcuts";
import { UnassignedTasks } from "./UnassignedTasks";

const unavailableReasons = (agents: AgentOption[]) => agents.flatMap((agent) => (!agent.available && agent.reason ? [agent.reason] : []));

type Props = { scope: TerminalScope; detail: TaskDetail; set: TaskSetData; reader: boolean; onOpened?: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

export function ExecutionPlanEditor({ scope, detail, set, reader, onOpened, onConversation }: Props) {
  const state = useExecutionPlan(scope, { enabled: true });
  const { view, plan, edit } = state;
  if (!view || !plan) return state.failure ? <p role="alert" className="text-sm text-destructive">{state.failure}</p> : null;
  const canEdit = view.canEdit && !reader;
  const taskIds = set.tasks.map((task) => task.id);
  const assigned = assignedIds(plan);
  const edits = planEditHandlers(edit, taskIds);
  const opened = async () => {
    await state.refresh();
    await onOpened?.();
  };
  return (
    <section aria-label={PLAN_HEADING} className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-[15px] font-semibold text-ink">{PLAN_HEADING}</h2>
        <p className="text-sm text-ink-2 tabular-nums">{sessionCountText(plan.items.length)}</p>
      </header>
      {view.stale ? <p role="status" className="rounded-xl border border-clarify/40 bg-clarify-wash px-4 py-3 text-sm text-clarify-ink">{STALE_NOTICE}</p> : null}
      {view.folderChange ? <PlanFolderChange change={view.folderChange} canEdit={canEdit} busy={state.saving} onAdopt={() => void state.adopt()} /> : null}
      {canEdit ? <PlanShortcuts agents={view.agents} onAllInOne={edits.allInOne} onOnePerTask={edits.onePerTask} onSameChoice={edits.sameChoice} /> : null}
      {canEdit ? unavailableReasons(view.agents).map((reason) => <p key={reason} className="text-xs text-ink-3">{reason}</p>) : null}
      <ol aria-label={PLAN_LIST_LABEL} className="space-y-3">
        {plan.items.map((item, index) => <PlanSessionCard key={item.key} position={index + 1} item={item} plan={plan} tasks={set.tasks} agents={view.agents} canEdit={canEdit} onMove={edits.move} onChoice={(choice) => edits.choose(item.key, choice)}><PlanSessionFooter saved={view.items.find((saved) => saved.id === item.id)} tasks={set.tasks} detail={detail} canStart={canEdit && !state.dirty} onOpened={opened} onConversation={onConversation} /></PlanSessionCard>)}
      </ol>
      <UnassignedTasks taskIds={taskIds.filter((taskId) => !assigned.has(taskId))} tasks={set.tasks} plan={plan} editable={canEdit} onMove={edits.move} />
      {canEdit ? <PlanSaveBar state={state} /> : null}
    </section>
  );
}
