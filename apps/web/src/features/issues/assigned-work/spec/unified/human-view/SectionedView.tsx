"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NOT_SPECIFIED } from "./humanViewCopy";

export type ViewSection = { id: string; label: string; count: number | null; content: ReactNode | null };
type Props = { label: string; sections: ViewSection[]; activeId: string | null; onPick: (id: string) => void; footer?: ReactNode };

function SectionNav({ label, sections, activeId, onPick, footer }: Omit<Props, "activeId"> & { activeId: string }) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {sections.map((section) => (
        <button key={section.id} type="button" aria-current={section.id === activeId ? "true" : undefined} onClick={() => onPick(section.id)} className={cn("flex shrink-0 items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors", section.id === activeId ? "bg-surface font-medium text-ink" : "text-ink-3 hover:bg-ink/5 hover:text-ink")}>
          <span>{section.label}</span>
          {section.count !== null && <span className={cn("text-xs tabular-nums", section.count === 0 ? "text-ink-3" : "text-ink-2")}>{section.count}</span>}
        </button>
      ))}
      {footer}
    </nav>
  );
}

export function SectionedView({ label, sections, activeId, onPick, footer }: Props) {
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  if (!active) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-[10rem_minmax(0,1fr)]">
      <SectionNav label={label} sections={sections} activeId={active.id} onPick={onPick} footer={footer} />
      <section aria-label={active.label} className="min-w-0 space-y-4">
        <h5 className="text-[15px] font-semibold text-ink">{active.label}</h5>
        {active.content ?? <p className="text-sm text-ink-3">{NOT_SPECIFIED}</p>}
      </section>
    </div>
  );
}
