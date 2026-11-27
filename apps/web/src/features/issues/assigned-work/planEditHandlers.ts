import type { EditablePlan, MoveTarget } from "./planContract";
import { allInOne, moveTask, onePerTask, sameChoiceForAll, setChoice } from "./planEditorModel";
import { setSessionTasks } from "./planSelectionModel";
import { addEmptySession, moveSession, removeFromSession, removeSession, setAfter } from "./planSessionModel";
import type { AgentChoice } from "./terminalContract";

type Edit = (change: (current: EditablePlan) => EditablePlan) => void;

export function planEditHandlers(edit: Edit, taskIds: string[]) {
  return {
    move: (taskId: string, target: MoveTarget) => edit((current) => moveTask(current, taskId, target)),
    allInOne: () => edit((current) => allInOne(current, taskIds)),
    onePerTask: () => edit((current) => onePerTask(current, taskIds)),
    sameChoice: (choice: AgentChoice) => edit((current) => sameChoiceForAll(current, choice)),
    choose: (key: string, choice: AgentChoice) => edit((current) => setChoice(current, { key, choice })),
    setTasks: (key: string, selected: string[]) => edit((current) => setSessionTasks(current, { key, taskIds: selected })),
    addSession: () => edit((current) => addEmptySession(current)),
    removeTask: (taskId: string) => edit((current) => removeFromSession(current, taskId)),
    removeSession: (key: string) => edit((current) => removeSession(current, key)),
    moveSession: (key: string, to: number) => edit((current) => moveSession(current, { key, to })),
    setAfter: (key: string, after: string[]) => edit((current) => setAfter(current, { key, after })),
  };
}

export type PlanEditHandlers = ReturnType<typeof planEditHandlers>;
