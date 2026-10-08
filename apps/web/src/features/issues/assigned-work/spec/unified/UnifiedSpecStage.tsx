"use client";

import { StageTabs } from "../../components/StageTabs";
import type { StageTab } from "../../stageTabs";
import { currentStageIndex, flowStages } from "./flowStages";
import { FlowTabPanel } from "./FlowTabPanel";
import { FLOW_TABS, tabOfStage, tabStage } from "./flowTabs";
import type { FlowView } from "./flowView";
import type { FlowOverview, FlowTarget } from "./unifiedContract";
import { useFlowCommands } from "./useFlowCommands";
import { useFlowData } from "./useFlowData";
import { usePlanDraft } from "./usePlanDraft";

type Props = { target: FlowTarget; initial: FlowOverview | null; canAct: boolean; lead?: StageTab };

export function UnifiedSpecStage({ target, initial, canAct, lead }: Props) {
  const data = useFlowData({ target, initial, canAct });
  const commands = useFlowCommands(target, data.refresh);
  const draft = usePlanDraft(data.overview?.plan ?? null);
  const stages = flowStages(data.overview);
  const turn = stages[currentStageIndex(stages)]!;
  const view: FlowView = { target, canAct, data, commands, draft, stages, turn };
  const flowTabs: StageTab[] = FLOW_TABS.map((tab) => ({ id: tab.key, label: tab.label, state: tabStage(tab, stages).state, panel: <FlowTabPanel tab={tab} view={view} /> }));
  return <StageTabs tabs={lead ? [lead, ...flowTabs] : flowTabs} current={tabOfStage(turn.key).key} canAct={canAct} />;
}
