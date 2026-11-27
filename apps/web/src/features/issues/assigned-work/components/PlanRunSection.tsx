"use client";

import { usePlanRun } from "../hooks/usePlanRun";
import type { PlanView } from "../planContract";
import type { TerminalScope } from "../terminalContract";
import { PlanRunBar } from "./PlanRunBar";

type Props = { scope: TerminalScope; view: PlanView; dirty: boolean; canEdit: boolean; onChanged: () => Promise<void> | void };

export function PlanRunSection({ scope, view, dirty, canEdit, onChanged }: Props) {
  const controls = usePlanRun({ scope, view, onChanged });
  return <PlanRunBar view={view} dirty={dirty} canEdit={canEdit} controls={controls} />;
}
