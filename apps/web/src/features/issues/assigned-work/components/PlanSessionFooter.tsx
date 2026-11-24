import type { TaskDetail } from "../contract";
import type { PlanItemView } from "../planContract";
import type { TaskItem } from "../taskSetContract";
import { PlanLaunchActions } from "./PlanLaunchActions";
import { PlanSessionState } from "./PlanSessionState";

type Props = { saved: PlanItemView | undefined; tasks: TaskItem[]; detail: TaskDetail; canStart: boolean; onOpened: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

export function PlanSessionFooter({ saved, tasks, detail, canStart, onOpened, onConversation }: Props) {
  if (!saved) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
      <PlanSessionState item={saved} tasks={tasks} onConversation={onConversation} />
      {canStart ? <div className="flex flex-wrap items-center gap-2"><PlanLaunchActions item={saved} detail={detail} onOpened={onOpened} /></div> : null}
    </div>
  );
}
