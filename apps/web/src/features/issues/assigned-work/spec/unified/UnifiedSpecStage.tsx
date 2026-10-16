"use client";

import type { ReplanOffer } from "../../components/ReplanControl";
import { useCallback, useState } from "react";
import { StageTabs, type StageFocus } from "../../components/StageTabs";
import type { StageTab } from "../../stageTabs";
import { currentStageIndex, flowStages } from "./flowStages";
import { FlowTabPanel } from "./FlowTabPanel";
import { flowTabsFor, tabOfStage, tabStage } from "./flowTabs";
import type { FlowView } from "./flowView";
import type { FlowOverview, FlowTarget } from "./unifiedContract";
import { useFlowCommands } from "./useFlowCommands";
import { useFlowData } from "./useFlowData";
import { usePlanDraft } from "./usePlanDraft";
import { OpenLocalWorktree } from "./OpenLocalWorktree";
import { WorkNavigationProvider } from "./human-view/humanViewNav";
import { WorkSummary } from "./human-view/WorkSummary";

const SPEC_TAB_ID = "spec";

type Props = { target: FlowTarget; initial: FlowOverview | null; canAct: boolean; lead?: StageTab; direct?: boolean; replan?: ReplanOffer | null };

export function UnifiedSpecStage({ target, initial, canAct, lead, direct = false, replan = null }: Props) {
  const data = useFlowData({ target, initial, canAct });
  const [stageFocus, setStageFocus] = useState<StageFocus | null>(null);
  const openSpecTab = useCallback(() => setStageFocus((focus) => ({ id: SPEC_TAB_ID, nonce: (focus?.nonce ?? 0) + 1 })), []);
  const commands = useFlowCommands(target, data.refresh);
  const draft = usePlanDraft(data.overview?.plan ?? null, direct);
  const stages = flowStages(data.overview, direct);
  const turn = stages[currentStageIndex(stages)]!;
  const view: FlowView = { target, canAct, data, commands, draft, stages, turn, replan };
  const flowTabs: StageTab[] = flowTabsFor(direct).map((tab) => ({ id: tab.key, label: tab.label, state: tabStage(tab, stages).state, panel: <FlowTabPanel tab={tab} view={view} /> }));
  const current = tabOfStage(turn.key).key;
  const localWorktree = data.overview?.plan?.actions.some((action) => action.workspace.kind === "local") || data.runs?.items.some((run) => run.workspaceKind === "local");
  const summary = !direct && data.overview ? <WorkSummary target={target} packages={data.overview.packages} status={{ turn, canAct }} /> : null;
  return (
    <WorkNavigationProvider onOpen={openSpecTab}>
      <div className="space-y-4">{canAct && localWorktree && <OpenLocalWorktree target={target} />}<StageTabs tabs={lead ? [lead, ...flowTabs] : flowTabs} current={current} canAct={canAct} summary={summary} focus={stageFocus} /></div>
    </WorkNavigationProvider>
  );
}
