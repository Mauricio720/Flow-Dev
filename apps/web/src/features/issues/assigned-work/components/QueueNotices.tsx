import Link from "next/link";
import { Button } from "@/components/ui/button";
import { projectSettingsPath, repositoryConnectPath } from "@/lib/navigation/projectRoutes";
import { accessProblem } from "@/lib/tasks/taskFailure";
import type { TaskFailure } from "../contract";
import { failureMessage } from "../taskCopy";
import { QUEUE_CONTINUING, QUEUE_EMPTY } from "../workCopy";
import type { QueueState } from "../queueState";

const BOARD_MISSING_REASON = "board_missing";
const SETTINGS_LINK_LABEL = "Ir para Configurações";

type FailureProps = { projectId: string; failure: TaskFailure; returnPath: string; onRetry: () => void };

export function QueueFailure({ projectId, failure, returnPath, onRetry }: FailureProps) {
  if (accessProblem(failure) === "authorization") {
    return (
      <form method="post" action={repositoryConnectPath(returnPath)} role="alert" className="space-y-3 px-5 py-5 text-sm">
        <p className="max-w-[65ch] leading-relaxed text-ink-2">{failureMessage(failure)}</p>
        <Button type="submit" size="sm">Autorizar repositórios no GitHub</Button>
      </form>
    );
  }
  if (failure.reason === BOARD_MISSING_REASON) {
    return (
      <div role="alert" className="space-y-3 px-5 py-5 text-sm">
        <p className="max-w-[65ch] leading-relaxed text-ink-2">{failureMessage(failure)}</p>
        <Button asChild size="sm"><Link href={projectSettingsPath(projectId)}>{SETTINGS_LINK_LABEL}</Link></Button>
      </div>
    );
  }
  return (
    <div role="alert" className="space-y-3 px-5 py-5 text-sm">
      <p className="max-w-[65ch] leading-relaxed text-ink-2">{failureMessage(failure)}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
}

export function QueueAvailability({ state }: { state: QueueState }) {
  if (state.availability === "empty") return <p role="status" className="px-5 py-6 text-sm text-ink-2">{QUEUE_EMPTY}</p>;
  if (state.availability === "scan_continuing") return <p role="status" className="px-5 py-3 text-sm text-ink-2">{QUEUE_CONTINUING}</p>;
  if (state.availability !== "retry_later") return null;
  const wait = state.retryAfterSeconds ? ` Tente de novo em cerca de ${state.retryAfterSeconds} segundos.` : "";
  return <p role="status" className="px-5 py-3 text-sm text-ink-2">O GitHub limitou as consultas por agora; a fila não está vazia.{wait}</p>;
}
