import { Badge } from "@/components/ui/badge";
import { formatMoment } from "@/lib/tasks/formatMoment";
import { READY_STATE, type CompozyBinding } from "./compozyContract";
import { invalidReasonCopy } from "./compozyCopy";

type Props = { binding: CompozyBinding; repository: string };

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-ink-3 sm:w-48">{label}</dt>
      <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function CompozyBindingSummary({ binding, repository }: Props) {
  const ready = binding.state === READY_STATE;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={ready ? "secondary" : "destructive"}>{ready ? "Pronto" : "Inválido"}</Badge>
        <span className="text-xs text-ink-3">Última verificação <time dateTime={binding.checkedAt} suppressHydrationWarning>{formatMoment(binding.checkedAt)}</time></span>
      </div>
      {!ready && <p className="text-sm text-destructive">{invalidReasonCopy(binding.failureCode, repository)}</p>}
      <dl className="flex flex-col gap-2 text-sm">
        <Fact label="Pasta local" value={binding.checkoutPath} />
        {binding.defaultBranch && <Fact label="Branch padrão" value={binding.defaultBranch} />}
        {binding.compozyWorkspaceId && <Fact label="Workspace do CompozyOS" value={binding.compozyWorkspaceId} />}
      </dl>
    </div>
  );
}
