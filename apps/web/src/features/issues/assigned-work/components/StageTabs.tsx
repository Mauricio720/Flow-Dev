"use client";

import { useState, type ReactNode } from "react";
import type { StageTab } from "../stageTabs";
import { StageTabList, stageTabDomId } from "./StageTabList";

export type StageFocus = { id: string; nonce: number };
type Props = { tabs: StageTab[]; current: string; canAct: boolean; summary?: ReactNode; headerAction?: ReactNode; focus?: StageFocus | null };
type Pick = { id: string; current: string };

const PANEL_ID = "stage-tab-panel";

export function StageTabs({ tabs, current, canAct, summary = null, headerAction = null, focus = null }: Props) {
  const [pick, setPick] = useState<Pick | null>(null);
  const [seenFocus, setSeenFocus] = useState(focus?.nonce ?? 0);
  if (focus && focus.nonce !== seenFocus) {
    setSeenFocus(focus.nonce);
    setPick({ id: focus.id, current });
  }
  const wantedId = pick?.current === current ? pick.id : current;
  const active = tabs.find((tab) => tab.id === wantedId) ?? tabs[0];
  if (!active) return null;
  if (tabs.length === 1) return <>{headerAction}{summary}{active.panel}</>;
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 bg-ground py-2"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><StageTabList tabs={tabs} activeId={active.id} panelId={PANEL_ID} canAct={canAct} onPick={(id) => setPick({ id, current })} /></div>{headerAction}</div></div>
      {summary}
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={stageTabDomId(active.id)} className="row-strike" key={active.id}>{active.panel}</div>
    </div>
  );
}
