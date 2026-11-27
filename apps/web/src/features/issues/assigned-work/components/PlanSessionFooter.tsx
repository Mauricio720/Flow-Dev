import type { TaskDetail } from "../contract";
import type { PlanItemView } from "../planContract";
import type { TaskItem } from "../taskSetContract";
import { PlanLaunchActions } from "./PlanLaunchActions";
import { PlanSessionState } from "./PlanSessionState";

type Props = { saved: PlanItemView | undefined; items: PlanItemView[]; tasks: TaskItem[]; detail: TaskDetail; canStart: boolean; onOpened: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

export function PlanSessionFooter({ saved, items, tasks, detail, canStart, onOpened, onConversation }: Props) {
  if (!saved) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
      <PlanSessionState item={saved} items={items} tasks={tasks} onConversation={onConversation} />
      {canStart ? <div className="flex flex-wrap items-center gap-2"><PlanLaunchActions item={saved} items={items} detail={detail} onOpened={onOpened} /></div> : null}
    </div>
  );
}
