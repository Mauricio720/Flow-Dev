"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_CHOICE } from "../launchPurposeModel";
import { APPLY_LABEL, BUILD_PLAN_LABEL, SHORTCUTS_LABEL, SHORTCUT_ALL_IN_ONE, SHORTCUT_ONE_PER_TASK, SHORTCUT_SAME_MODEL } from "../planCopy";
import type { AgentChoice, AgentOption } from "../terminalContract";
import { AgentChoiceField } from "./AgentChoiceField";

type Props = { agents: AgentOption[]; onAllInOne: () => void; onOnePerTask: () => void; onSameChoice: (choice: AgentChoice) => void };

export function PlanShortcuts({ agents, onAllInOne, onOnePerTask, onSameChoice }: Props) {
  const [choosing, setChoosing] = useState(false);
  const [choice, setChoice] = useState<AgentChoice>(DEFAULT_CHOICE);
  return (
    <div role="group" aria-label={SHORTCUTS_LABEL} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-ink-3">{BUILD_PLAN_LABEL}</span>
        <Button type="button" size="sm" variant="secondary" onClick={onAllInOne}>{SHORTCUT_ALL_IN_ONE}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onOnePerTask}>{SHORTCUT_ONE_PER_TASK}</Button>
        <Button type="button" size="sm" variant="secondary" aria-expanded={choosing} onClick={() => setChoosing((value) => !value)}>{SHORTCUT_SAME_MODEL}</Button>
      </div>
      {choosing && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="min-w-0 flex-1"><AgentChoiceField compact agents={agents} value={choice} onChange={setChoice} /></div>
          <Button type="button" size="sm" onClick={() => { onSameChoice(choice); setChoosing(false); }}>{APPLY_LABEL}</Button>
        </div>
      )}
    </div>
  );
}
