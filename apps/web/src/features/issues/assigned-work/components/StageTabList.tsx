"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { READER_TAB_STATE_LABELS, STAGE_TAB_STATE_LABELS, type StageTab, type StageTabState } from "../stageTabs";
import { StageStop } from "./StageStop";

type Props = { tabs: StageTab[]; activeId: string; panelId: string; canAct: boolean; onPick: (id: string) => void };

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
const STATE_INK: Record<StageTabState, string> = { done: "text-merge-ink", current: "text-ink", failed: "text-destructive", pending: "text-ink-3", yours: "text-clarify-ink" };
const LIST_FRAME = "grid auto-cols-fr grid-flow-col gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1";
const TAB_FRAME = "flex min-w-[148px] items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:-outline-offset-2 sm:min-w-0";
const SELECTED_TAB = "bg-raised shadow-raised ring-1 ring-line";
const IDLE_TAB = "hover:bg-ink/5";

export const stageTabDomId = (id: string) => `stage-tab-${id}`;

export function StageTabList({ tabs, activeId, panelId, canAct, onPick }: Props) {
  const captions = canAct ? STAGE_TAB_STATE_LABELS : READER_TAB_STATE_LABELS;
  const moveFocus = (event: KeyboardEvent) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    const position = tabs.findIndex((tab) => tab.id === activeId);
    const target = tabs[(position + step + tabs.length) % tabs.length]!;
    onPick(target.id);
    document.getElementById(stageTabDomId(target.id))?.focus();
  };
  return (
    <div role="tablist" aria-label="Etapas do trabalho" onKeyDown={moveFocus} className={LIST_FRAME}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button key={tab.id} id={stageTabDomId(tab.id)} type="button" role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1} onClick={() => onPick(tab.id)} className={cn(TAB_FRAME, selected ? SELECTED_TAB : IDLE_TAB)}>
            <StageStop state={tab.state} />
            <span className="min-w-0">
              <span className={cn("block truncate text-sm leading-snug", selected ? "font-semibold text-ink" : "font-medium text-ink-2")}>{tab.label}</span>
              <span className={cn("block truncate text-xs", STATE_INK[tab.state])}>{captions[tab.state]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
