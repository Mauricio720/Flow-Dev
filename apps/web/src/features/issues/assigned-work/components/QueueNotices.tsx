import { Button } from "@/components/ui/button";
import { repositoryConnectPath } from "@/lib/navigation/projectRoutes";
import { accessProblem } from "@/lib/tasks/taskFailure";
import type { TaskFailure } from "../contract";
import { failureMessage } from "../taskCopy";
import { QUEUE_CONTINUING, QUEUE_EMPTY } from "../workCopy";
import type { QueueState } from "../queueState";

type FailureProps = { failure: TaskFailure; returnPath: string; onRetry: () => void };

export function QueueFailure({ failure, returnPath, onRetry }: FailureProps) {
  if (accessProblem(failure) === "authorization") {
    return (
      <form method="post" action={repositoryConnectPath(returnPath)} role="alert" className="space-y-3 px-5 py-5 text-sm">
        <p className="max-w-[65ch] leading-relaxed text-ink-2">{failureMessage(failure)}</p>
        <Button type="submit" size="sm">Autorizar repositórios no GitHub</Button>
      </form>
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
