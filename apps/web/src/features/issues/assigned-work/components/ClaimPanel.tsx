import type { WorkView } from "../contract";
import { reasonMessage } from "../taskCopy";
import { CLAIM_STATE_LABEL, CLAIM_STATE_NOTE, OBSERVER_NOTE, OPERATOR_NOTE } from "../workCopy";

const OTHER_OPERATOR = "outra pessoa do projeto";

type Props = { view: WorkView };

function Capability({ view }: { view: WorkView }) {
  if (view.viewerCanOperate) return <p className="text-sm font-medium">{OPERATOR_NOTE}</p>;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{OBSERVER_NOTE}</p>
      {view.reason && <p className="max-w-[65ch] text-sm text-ink-2">{reasonMessage(view.reason)}</p>}
    </div>
  );
}

export function ClaimPanel({ view }: Props) {
  const { claim } = view;
  return (
    <section aria-label="Reivindicação e permissões" className="space-y-3 rounded-xl border border-line bg-raised px-5 py-4">
      <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">{CLAIM_STATE_LABEL[claim.state]}</span>
        {claim.state === "claimed" && <span className="text-ink-2">Operador: {view.viewerCanOperate ? "você" : OTHER_OPERATOR}</span>}
      </p>
      <p className="max-w-[65ch] text-sm text-ink-2">{CLAIM_STATE_NOTE[claim.state]}</p>
      <Capability view={view} />
    </section>
  );
}
