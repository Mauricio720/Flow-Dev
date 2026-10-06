import type { TaskFailure, TaskReceipt, TaskSummary } from "../contract";

export type ActionContext = {
  projectId: string;
  task: TaskSummary | null;
  input: { clear: (sent: string) => void };
  onAccepted: (receipt: TaskReceipt) => Promise<void> | void;
  onChanged: () => Promise<void>;
  onFailure: (failure: TaskFailure) => void;
};

export type TaskCommandBase = { projectId: string; taskId: string; requestKey: string; expectedVersion: number };
