import type { TaskPublication } from "../contract";
import { READY_ASSIGNMENT_MESSAGE } from "../readyAssignmentCopy";

type Props = { readyAssignment: TaskPublication["readyAssignment"] };

export function ReadyAssignmentNotice({ readyAssignment }: Props) {
  if (!readyAssignment) return null;
  return <p role="status" className="max-w-[65ch] text-sm text-ink-2">{READY_ASSIGNMENT_MESSAGE[readyAssignment.state]}</p>;
}
