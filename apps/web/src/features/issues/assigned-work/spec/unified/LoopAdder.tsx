"use client";

import { Button } from "@/components/ui/button";
import { loopTitle, offerReasonLabel } from "./loopCatalogCopy";
import type { LoopOffer } from "./loopOffer";
import type { FlowLoopOption } from "./unifiedContract";

type Props = { offer: LoopOffer; onAdd: (option: FlowLoopOption) => void };

export function LoopAdder({ offer, onAdd }: Props) {
  if (offer.notice) return <p role="status" className="text-sm text-ink-2">{offer.notice}</p>;
  const [only] = offer.offerable;
  if (offer.single && only) return <Button type="button" onClick={() => onAdd(only)}>Adicionar {loopTitle(only.name)}</Button>;
  return (
    <label className="flex items-center gap-2 text-sm">Adicionar Loop
      <select className="h-9 rounded-md border border-input bg-surface px-2" value="" onChange={(event) => { const option = offer.offerable.find((item) => item.name === event.target.value); if (option) onAdd(option); }}>
        <option value="">Escolha um Loop</option>
        {offer.choices.map((loop) => <option key={loop.name} value={loop.name} disabled={!loop.offerable}>{loop.name} v{loop.version}{loop.offerable ? "" : ` (${offerReasonLabel(loop.reason)})`}</option>)}
      </select>
    </label>
  );
}
