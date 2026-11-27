import { TaskError } from "../tasks/taskErrors";
import { planMessage } from "../tasks-set/planErrorCatalog";
import { sessionMessage } from "../terminal/sessionErrorCatalog";
import { terminalMessage } from "../terminal/terminalErrorCatalog";

const UNKNOWN_LAUNCH_FAILURE = "O início da sessão falhou.";

export function launchFailureMessage(error: unknown) {
  if (!(error instanceof TaskError)) return UNKNOWN_LAUNCH_FAILURE;
  return terminalMessage(error.reason, error.fieldErrors) ?? sessionMessage(error.reason) ?? planMessage(error.reason, error.fieldErrors) ?? UNKNOWN_LAUNCH_FAILURE;
}
