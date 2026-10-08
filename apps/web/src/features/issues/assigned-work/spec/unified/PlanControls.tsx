"use client";

import { Button } from "@/components/ui/button";
import { ownsDraft, type FlowTab } from "./flowTabs";
import type { FlowCommands, PlanDraft } from "./flowView";
import { LoopAdder } from "./LoopAdder";
import { loopOffer, showsLoopAdder } from "./loopOffer";
import type { FlowOptions, FlowPlan } from "./unifiedContract";

type Props = { plan: FlowPlan | null; options: FlowOptions; commands: FlowCommands; state: PlanDraft; tab: FlowTab; dirty: boolean };

const TASKS_KIND = "create_tasks";

export function PlanControls({ plan, options, commands, state, tab, dirty }: Props) {
  const { draft, revision } = state;
  const tasksAvailable = options.actions.find((action) => action.kind === TASKS_KIND)?.available ?? false;
  const needsTasks = tab.actionKind === TASKS_KIND && tasksAvailable && !draft.some((action) => action.kind === TASKS_KIND);
  const added = draft.some((action) => ownsDraft(tab, action));
  const offer = loopOffer({ tab, plan, options, added });
  const adding = showsLoopAdder(offer, added);
  const settled = !dirty && !!plan && plan.actions.every((action) => action.state !== "planned");
  const savable = !settled && (added || (dirty && !!plan));
  if (!needsTasks && !adding && !savable) return null;
  const providers = new Map(options.connections.map((connection) => [connection.id, connection.providerKind]));
  return (
    <div className="flex flex-wrap items-center gap-3">
      {needsTasks && <Button type="button" variant={dirty ? "outline" : "default"} onClick={() => state.addAction(TASKS_KIND)}>Adicionar Criar tarefas</Button>}
      {offer && adding && <LoopAdder offer={offer} onAdd={(option) => state.addLoop(option, options.taskId)} />}
      {savable && <Button type="button" variant={dirty ? "default" : "outline"} disabled={commands.busy || !dirty} onClick={() => void commands.savePlan({ draft, expectedRevision: revision, context: { providers, loops: options.loops } })}>Salvar fluxo</Button>}
    </div>
  );
}
