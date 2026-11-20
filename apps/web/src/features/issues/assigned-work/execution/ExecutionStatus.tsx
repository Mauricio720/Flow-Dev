import { Badge } from "@/components/ui/badge";
import type { TaskExecutionCurrent } from "./useTaskExecution";
import { executionBlockMessage, executionReviewLabel, executionStatusCopy } from "./executionCopy";

const COMPLETED_BADGE = "border-merge/40 bg-merge-wash text-merge-ink";
const MINUTE_MS = 60_000;

type Props = { current: TaskExecutionCurrent | null; route: string | null; canStart: boolean; blocker: string | null };

function staleLabel(lastSyncedAt: string | null) {
  if (!lastSyncedAt) return null;
  const timestamp = Date.parse(lastSyncedAt);
  if (Number.isNaN(timestamp)) return null;
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / MINUTE_MS));
  return `Atualizado há ${minutes} min — CompozyOS indisponível`;
}

function BadgeStatus({ state }: { state: string }) {
  const copy = executionStatusCopy(state);
  return <Badge variant={copy.variant} className={state === "completed" ? COMPLETED_BADGE : undefined}>{copy.label}</Badge>;
}

function ReviewSummary({ current }: { current: TaskExecutionCurrent }) {
  if (!current.review) return null;
  return <div className="space-y-1"><p className="text-sm font-medium">{executionReviewLabel(current.review.outcome)} — tentativa {current.runAttempt ?? current.attempt}</p>{current.review.summary && <p className="max-w-[65ch] text-sm text-ink-2">{current.review.summary}</p>}</div>;
}

function RunningDetail({ current }: { current: TaskExecutionCurrent }) {
  return <div className="space-y-3"><p className="text-sm text-ink-2">Agente: {current.agent ?? "CompozyOS"} · Tentativa {current.runAttempt ?? current.attempt}</p><ReviewSummary current={current} /></div>;
}

function AttentionDetail({ current }: { current: TaskExecutionCurrent }) {
  const identifier = current.compozyTaskIdentifiers[0] ?? "identificador indisponível";
  return <div className="space-y-2"><p className="text-sm text-ink-2">{current.attention ?? current.blocks.map((block) => block.reason).join(" · ")}</p><p className="text-sm font-medium">Resolva no CompozyOS: Task {identifier}</p></div>;
}

function CompletedDetail({ current }: { current: TaskExecutionCurrent }) {
  if (current.pullRequestUrl) return <a className="text-sm font-medium text-project-ink underline underline-offset-4" href={current.pullRequestUrl} target="_blank" rel="noreferrer">Abrir pull request</a>;
  const identifier = current.compozyTaskIdentifiers[0] ?? "identificador indisponível";
  return <p className="text-sm text-ink-2">Concluída — PR não encontrado; veja o resultado no CompozyOS: Task {identifier}.</p>;
}

function CurrentDetail({ current }: { current: TaskExecutionCurrent }) {
  if (current.state === "dispatching") return <p className="text-sm text-ink-2">O Flow Dev está preparando as Tasks no CompozyOS.</p>;
  if (current.state === "unavailable") return <p className="text-sm text-ink-2">Nada foi iniciado.</p>;
  if (current.state === "in_progress" || current.state === "spec_in_progress") return <RunningDetail current={current} />;
  if (current.state === "spec_review") return <p className="text-sm text-ink-2">A spec está pronta para revisão.</p>;
  if (current.state === "needs_attention") return <AttentionDetail current={current} />;
  if (current.state === "completed") return <CompletedDetail current={current} />;
  const tone = current.state === "failed" ? "text-destructive" : "text-ink-2";
  return <p className={`text-sm ${tone}`}>{current.failureDetail ?? current.failureCode ?? executionStatusCopy(current.state).headline}</p>;
}

export function ExecutionStatus({ current, route, canStart, blocker }: Props) {
  const lastSynced = current && !current.compozyReachable ? staleLabel(current.lastSyncedAt) : null;
  const blockMessage = executionBlockMessage(blocker);
  return (
    <section aria-label="Estado da execução" className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3"><h3 className="text-[15px] font-semibold">Andamento</h3>{current ? <BadgeStatus state={current.state} /> : <Badge variant={canStart ? "outline" : "clarify"}>{canStart ? "Pronta para executar" : "Bloqueada para iniciar"}</Badge>}</header>
      <div className="space-y-3 px-5 py-4">
        {lastSynced && <p role="status" className="text-sm text-ink-2">{lastSynced}</p>}
        {route && <p className="text-sm text-ink-2">Rota: {route}</p>}
        {current ? <CurrentDetail current={current} /> : canStart ? <p className="text-sm text-ink-2">Pronta para executar no CompozyOS.</p> : blockMessage && <p className="text-sm text-ink-2">{blockMessage}</p>}
      </div>
    </section>
  );
}
