"use client";

import type { TaskDetail } from "../contract";
import { useExecutionPlan } from "../hooks/useExecutionPlan";
import { usePlanSelectionDialog } from "../hooks/usePlanSelectionDialog";
import { planEditHandlers } from "../planEditHandlers";
import { assignedIds } from "../planEditorModel";
import { PLAN_HEADING, STALE_NOTICE } from "../planCopy";
import type { TaskSetData } from "../taskSetContract";
import type { AgentOption, TerminalScope } from "../terminalContract";
import { PlanFolderChange } from "./PlanFolderChange";
import { PlanHeader } from "./PlanHeader";
import { PlanNewSessionButton } from "./PlanNewSessionButton";
import { PlanRunSection } from "./PlanRunSection";
import { PlanSaveBar } from "./PlanSaveBar";
import { PlanSessionList } from "./PlanSessionList";
import { PlanSessionTasksHost } from "./PlanSessionTasksHost";
import { PlanShortcuts } from "./PlanShortcuts";
import { UnassignedTasks } from "./UnassignedTasks";

const unavailableReasons = (agents: AgentOption[]) => agents.flatMap((agent) => (!agent.available && agent.reason ? [agent.reason] : []));

type Props = { scope: TerminalScope; detail: TaskDetail; set: TaskSetData; reader: boolean; onOpened?: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

export function ExecutionPlanEditor({ scope, detail, set, reader, onOpened, onConversation }: Props) {
  const state = useExecutionPlan(scope, { enabled: true });
  const selection = usePlanSelectionDialog();
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
      <PlanHeader count={plan.items.length} />
      <PlanRunSection scope={scope} view={view} dirty={state.dirty} canEdit={canEdit} onChanged={state.refresh} />
      {view.stale ? <p role="status" className="rounded-xl border border-clarify/40 bg-clarify-wash px-4 py-3 text-sm text-clarify-ink">{STALE_NOTICE}</p> : null}
      {view.folderChange ? <PlanFolderChange change={view.folderChange} canEdit={canEdit} busy={state.saving} onAdopt={() => void state.adopt()} /> : null}
      {canEdit ? <PlanShortcuts agents={view.agents} onAllInOne={edits.allInOne} onOnePerTask={edits.onePerTask} onSameChoice={edits.sameChoice} /> : null}
      {canEdit ? unavailableReasons(view.agents).map((reason) => <p key={reason} className="text-xs text-ink-3">{reason}</p>) : null}
      <PlanSessionList view={view} plan={plan} tasks={set.tasks} detail={detail} canEdit={canEdit} canStart={canEdit && !state.dirty} edits={edits} selection={selection} onOpened={opened} onConversation={onConversation} />
      {canEdit ? <PlanNewSessionButton onAdd={edits.addSession} /> : null}
      <UnassignedTasks taskIds={taskIds.filter((taskId) => !assigned.has(taskId))} tasks={set.tasks} editable={canEdit} onMove={edits.move} />
      {canEdit ? <PlanSaveBar state={state} /> : null}
      <PlanSessionTasksHost selection={selection} plan={plan} tasks={set.tasks} onSetTasks={edits.setTasks} />
    </section>
  );
}
