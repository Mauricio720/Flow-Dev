import type { DragEvent } from "react";

export type DragPayload = { kind: "task"; taskId: string } | { kind: "session"; key: string };

const TASK_TYPE = "application/x-flow-dev-task";
const SESSION_TYPE = "application/x-flow-dev-session";
const MOVE_EFFECT = "move";

export function writeDrag(event: DragEvent, payload: DragPayload) {
  event.stopPropagation();
  event.dataTransfer.setData(payload.kind === "task" ? TASK_TYPE : SESSION_TYPE, payload.kind === "task" ? payload.taskId : payload.key);
  event.dataTransfer.effectAllowed = MOVE_EFFECT;
}

function readDrag(event: DragEvent): DragPayload | null {
  const taskId = event.dataTransfer.getData(TASK_TYPE);
  if (taskId) return { kind: "task", taskId };
  const key = event.dataTransfer.getData(SESSION_TYPE);
  return key ? { kind: "session", key } : null;
}

export function dropTargetProps(onDrop: (payload: DragPayload) => void) {
  return {
    onDragEnter: (event: DragEvent) => event.preventDefault(),
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = MOVE_EFFECT;
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const payload = readDrag(event);
      if (payload) onDrop(payload);
    },
  };
}
