import type { EditablePlan, MoveTarget } from "./planContract";
import { allInOne, moveTask, onePerTask, sameChoiceForAll, setChoice } from "./planEditorModel";
import type { AgentChoice } from "./terminalContract";

type Edit = (change: (current: EditablePlan) => EditablePlan) => void;

export function planEditHandlers(edit: Edit, taskIds: string[]) {
  return {
    move: (taskId: string, target: MoveTarget) => edit((current) => moveTask(current, taskId, target)),
    allInOne: () => edit((current) => allInOne(current, taskIds)),
    onePerTask: () => edit((current) => onePerTask(current, taskIds)),
    sameChoice: (choice: AgentChoice) => edit((current) => sameChoiceForAll(current, choice)),
    choose: (key: string, choice: AgentChoice) => edit((current) => setChoice(current, { key, choice })),
  };
}
