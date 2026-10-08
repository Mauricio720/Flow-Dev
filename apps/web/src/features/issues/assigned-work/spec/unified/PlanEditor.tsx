"use client";

import { ActionRow } from "./ActionRow";
import type { FlowOptions, FlowPlan } from "./unifiedContract";
import { ownsDraft, type FlowTab } from "./flowTabs";
import type { FlowCommands, PlanDraft } from "./flowView";
import { PlanControls } from "./PlanControls";
import { isDirty } from "./planDirty";

type Props = { plan: FlowPlan | null; options: FlowOptions; commands: FlowCommands; state: PlanDraft; tab: FlowTab };

const EMPTY_STAGE = "Nenhuma ação foi adicionada a esta etapa ainda.";

export function PlanEditor({ plan, options, commands, state, tab }: Props) {
  const { draft, revision } = state;
  const dirty = isDirty(plan, draft);
  const rows = draft.map((action, index) => ({ action, index })).filter((row) => ownsDraft(tab, row.action));
  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-ink-2">{EMPTY_STAGE}</p>}
      {rows.length > 0 && (
        <ol className="divide-y divide-line border-y border-line" aria-label="Ações do fluxo">
          {rows.map(({ action, index }) => (
            <ActionRow key={`${action.kind}-${index}`} index={index} draft={action} saved={plan?.actions[index] ?? null} options={options} planDirty={dirty} busy={commands.busy}
              onRuntime={(runtime) => state.setRuntime(index, runtime)} onWorkspace={(workspace) => state.setWorkspace(index, workspace)} onLoop={(loop) => state.setLoop(index, loop)}
              onLanguage={(language) => state.setLanguage(index, language)}
              onRemove={() => state.removeAction(index)} onRenewLoop={() => { const option = options.loops.find((item) => item.name === action.loop?.name); if (option) state.renewLoop(index, option); }}
              preparation={plan?.actions[index] ? commands.preparations[plan.actions[index].id] : undefined}
              onPrepare={(actionId) => void commands.prepareLocalAction({ actionId, expectedRevision: revision })}
              onStart={(actionId) => void commands.startAction({ actionId, expectedRevision: revision, ...(commands.preparations[actionId] ? { preparationId: commands.preparations[actionId].id } : {}) })}
              onRetry={(actionId) => void commands.retryAction({ actionId, expectedRevision: revision, ...(commands.preparations[actionId] ? { preparationId: commands.preparations[actionId].id } : {}) })} />
          ))}
        </ol>
      )}
      <PlanControls plan={plan} options={options} commands={commands} state={state} tab={tab} dirty={dirty} />
    </div>
  );
}
