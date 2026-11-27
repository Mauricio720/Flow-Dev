import type { TaskDetail } from "../contract";
import type { PlanSelectionDialogState } from "../hooks/usePlanSelectionDialog";
import type { PlanEditHandlers } from "../planEditHandlers";
import type { EditablePlan, PlanView } from "../planContract";
import { PLAN_LIST_LABEL } from "../planCopy";
import type { TaskItem } from "../taskSetContract";
import { PlanSessionCard } from "./PlanSessionCard";
import { PlanSessionConditions } from "./PlanSessionConditions";
import { PlanSessionFooter } from "./PlanSessionFooter";

type Props = { view: PlanView; plan: EditablePlan; tasks: TaskItem[]; detail: TaskDetail; canEdit: boolean; canStart: boolean; edits: PlanEditHandlers; selection: PlanSelectionDialogState; onOpened: () => Promise<void>; onConversation?: (sessionId: string) => void };

export function PlanSessionList({ view, plan, tasks, detail, canEdit, canStart, edits, selection, onOpened, onConversation }: Props) {
  const total = plan.items.length;
  return (
    <ol aria-label={PLAN_LIST_LABEL} className="space-y-3">
      {plan.items.map((item, index) => {
        const position = index + 1;
        const saved = view.items.find((candidate) => candidate.id === item.id);
        const conditions = <PlanSessionConditions item={item} position={position} plan={plan} tasks={tasks} saved={saved} editable={canEdit && !item.started} onAfter={(after) => edits.setAfter(item.key, after)} />;
        return (
          <PlanSessionCard key={item.key} position={position} total={total} item={item} tasks={tasks} agents={view.agents} canEdit={canEdit} edits={edits} conditions={conditions} onChooseTasks={(button) => selection.open({ kind: "item", key: item.key, position }, button)}>
            <PlanSessionFooter saved={saved} items={view.items} tasks={tasks} detail={detail} canStart={canStart} onOpened={onOpened} onConversation={onConversation} />
          </PlanSessionCard>
        );
      })}
    </ol>
  );
}
