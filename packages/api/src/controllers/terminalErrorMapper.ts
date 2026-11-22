import { TRPCError } from "@trpc/server";
import { OPERATOR_REQUIRED_MESSAGE } from "../application/services/terminal/terminalErrorCatalog";
import { mapTaskError, normalizeTaskError } from "./taskErrorMapper";

export function mapTerminalError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  const taskError = normalizeTaskError(error);
  if (taskError.reason === "operator_required") throw new TRPCError({ code: "FORBIDDEN", message: OPERATOR_REQUIRED_MESSAGE, cause: taskError });
  return mapTaskError(taskError);
}
