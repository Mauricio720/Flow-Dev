import type { TaskFailure, TaskReceipt } from "../contract";

export type StageControls = {
  onAccepted: (receipt: TaskReceipt) => Promise<void> | void;
  onFailure: (failure: TaskFailure) => void;
  onNewIntent: () => void;
  refresh: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
};
