"use client";

import { useState } from "react";
import type { StageTab } from "../stageTabs";
import { StageTabList, stageTabDomId } from "./StageTabList";

type Props = { tabs: StageTab[]; current: string; canAct: boolean };
type Pick = { id: string; current: string };

const PANEL_ID = "stage-tab-panel";

export function StageTabs({ tabs, current, canAct }: Props) {
  const [pick, setPick] = useState<Pick | null>(null);
  const wantedId = pick?.current === current ? pick.id : current;
  const active = tabs.find((tab) => tab.id === wantedId) ?? tabs[0];
  if (!active) return null;
  if (tabs.length === 1) return <>{active.panel}</>;
  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 bg-ground py-2"><StageTabList tabs={tabs} activeId={active.id} panelId={PANEL_ID} canAct={canAct} onPick={(id) => setPick({ id, current })} /></div>
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={stageTabDomId(active.id)} className="row-strike" key={active.id}>{active.panel}</div>
    </div>
  );
}
