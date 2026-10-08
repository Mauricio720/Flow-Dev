import type { TaskFailure } from "./contract";
import { PLANNING_REASON_MESSAGE } from "./planningCopy";
import { SPEC_REASON_MESSAGE } from "./spec/specReasons";
import { WORK_REASON_MESSAGE } from "./workReasons";

const FALLBACK_MESSAGE = "Não foi possível concluir a operação. O que já estava salvo continua disponível; tente novamente.";
const CONNECTION_MESSAGE = "Sem resposta do servidor. Confira a conexão e tente novamente.";

export function reasonMessage(reason: string | null) {
  return (reason && (WORK_REASON_MESSAGE[reason] ?? PLANNING_REASON_MESSAGE[reason] ?? SPEC_REASON_MESSAGE[reason])) || FALLBACK_MESSAGE;
}

export function failureMessage(failure: TaskFailure) {
  if (failure.code === null && failure.reason === null) return CONNECTION_MESSAGE;
  return reasonMessage(failure.reason);
}
