"use client";

import { useState } from "react";
import { DEFAULT_CHOICE, ROUTE_PURPOSE, agentProblemOf, defaultSpecId, openPurposeOf, purposeKeyOf } from "../launchPurposeModel";
import type { AgentChoice, LaunchPurpose, PermissionMode, PromptProblem, TerminalExtra, TerminalScope } from "../terminalContract";
import { useLaunchPreflight } from "./useLaunchPreflight";
import { NO_EXTRA, useTerminalSender } from "./useTerminalSender";

export function promptProblemOf(prompt: string, maxLength: number): PromptProblem {
  if (prompt.trim().length === 0) return "empty";
  return prompt.length > maxLength ? "too_long" : null;
}

const DEFAULT_PERMISSION_MODE: PermissionMode = "bypass";

export function useTerminalLaunch(scope: TerminalScope, purpose: LaunchPurpose = ROUTE_PURPOSE) {
  const [specId, setSpecId] = useState(() => defaultSpecId(purpose));
  const [chosen, setChosen] = useState<AgentChoice | null>(null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const routeChoice = chosen ?? DEFAULT_CHOICE;
  const key = purposeKeyOf(purpose, specId, purpose.kind === "route" ? routeChoice : null);
  const load = useLaunchPreflight(scope, key);
  const choice = purpose.kind === "route" ? routeChoice : chosen ?? load.preflight?.choice ?? DEFAULT_CHOICE;
  const sender = useTerminalSender(scope, load, { permissionMode, purpose: openPurposeOf(key, choice) });
  const confirm = (extra: TerminalExtra = NO_EXTRA) => sender.send(extra, false);
  const confirmAdditional = () => sender.send(sender.lastExtra.current, true);
  const declineAdditional = () => sender.setNeedsConfirmation(false);
  const promptProblem = load.preflight ? promptProblemOf(load.prompt, load.preflight.maxPromptLength) : null;
  const agentProblem = agentProblemOf(choice, load.preflight?.agents ?? []);
  const serviceRunning = load.preflight?.sessionService.running ?? true;
  return { preflight: load.preflight, serviceRunning, permissionMode, setPermissionMode, prompt: load.prompt, setPrompt: load.setPrompt, promptProblem, confirm, confirmAdditional, declineAdditional, needsConfirmation: sender.needsConfirmation, phase: load.phase, failure: sender.failure, opened: sender.opened, purpose, choice, setChoice: setChosen, specId, setSpecId, agentProblem };
}

export type TerminalLaunch = ReturnType<typeof useTerminalLaunch>;
