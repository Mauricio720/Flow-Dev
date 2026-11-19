import { TaskError, type TaskErrorReason } from "../services/tasks/taskErrors";

export type CompozyErrorDetail = { operation: string; status?: number; daemonCode?: string };

export class CompozyCallError extends TaskError {
  constructor(reason: TaskErrorReason, readonly detail: CompozyErrorDetail, cause?: unknown) {
    super(reason, undefined, cause);
    this.name = "CompozyCallError";
  }
}
