"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTRACT_PART_LABELS } from "./humanViewCopy";
import { itemDomId, useViewLinks } from "./humanViewNav";
import { BlockText, InlineText, SourceLink } from "./OverviewText";
import type { Contract, ContractPart } from "./viewTypes";

type PartKind = ContractPart["kind"] | "all";
const FILTERS: PartKind[] = ["table", "example"];
const ALL: PartKind = "all";

function ContractCard({ contract, onOpenDocument }: { contract: Contract; onOpenDocument: (path: string) => void }) {
  const links = useViewLinks();
  const kinds = [ALL, ...FILTERS.filter((kind) => contract.parts.some((part) => part.kind === kind))];
  const [picked, setPicked] = useState<PartKind | null>(null);
  const active = picked && kinds.includes(picked) ? picked : kinds[0];
  return (
    <li id={itemDomId(contract.id)} tabIndex={-1} className="scroll-mt-28 space-y-3 py-4 first:pt-0 last:pb-0">
      <h6 className="text-[15px] leading-6 font-semibold text-ink"><InlineText text={contract.title} /></h6>
      {kinds.length > 1 && (
        <div role="group" aria-label={`Partes do contrato ${contract.title.replace(/`/g, "")}`} className="flex flex-wrap gap-1">
          {kinds.map((kind) => <button key={kind} type="button" aria-pressed={kind === active} onClick={() => setPicked(kind)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", kind === active ? "bg-surface text-ink" : "text-ink-3 hover:bg-ink/5 hover:text-ink")}>{CONTRACT_PART_LABELS[kind]}</button>)}
        </div>
      )}
      <div className="min-w-0 space-y-3">{contract.parts.filter((part) => active === ALL || part.kind === active).map((part, index) => <BlockText key={index} text={part.markdown} onOpenDocument={onOpenDocument} />)}</div>
      {links && <SourceLink source={contract.source} onOpen={links.openSource} />}
    </li>
  );
}

export function ContractList({ contracts, onOpenDocument }: { contracts: Contract[]; onOpenDocument: (path: string) => void }) {
  return <ul className="divide-y divide-line">{contracts.map((contract) => <ContractCard key={contract.id} contract={contract} onOpenDocument={onOpenDocument} />)}</ul>;
}
