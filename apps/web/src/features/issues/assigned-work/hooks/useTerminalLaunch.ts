"use client";

import { useEffect, useRef, useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import { fetchTerminalPreflight, openTerminal } from "../terminalClient";
import type { PermissionMode, PromptProblem, TerminalExtra, TerminalOpened, TerminalPhase, TerminalPreflight, TerminalScope } from "../terminalContract";
import { OPEN_FAILED_MESSAGE } from "../terminalCopy";

const NO_EXTRA: TerminalExtra = { attachmentIds: [], issueImageIds: [] };

export function promptProblemOf(prompt: string, maxLength: number): PromptProblem {
  if (prompt.trim().length === 0) return "empty";
  return prompt.length > maxLength ? "too_long" : null;
}

const SESSION_ACTIVE_REASON = "session_already_active";
const DEFAULT_PERMISSION_MODE: PermissionMode = "bypass";

function isSessionActive(error: unknown) {
  const data = trpcData(error);
  return Boolean(data && "reason" in data && data.reason === SESSION_ACTIVE_REASON);
}

function failureMessage(error: unknown) {
  const hasReason = Boolean(trpcData(error) && "reason" in trpcData(error)!);
  return error instanceof Error && hasReason ? error.message : OPEN_FAILED_MESSAGE;
}

function usePreflight(scope: TerminalScope) {
  const [preflight, setPreflight] = useState<TerminalPreflight | null>(null);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<TerminalPhase>("loading");
  useEffect(() => {
    let active = true;
    fetchTerminalPreflight({ projectId: scope.projectId, taskId: scope.taskId }).then((result) => {
      if (!active) return;
      setPreflight(result);
      setPrompt(result.defaultPrompt);
      setPhase("ready");
    }, () => active && setPhase("load_failed"));
    return () => { active = false; };
  }, [scope.projectId, scope.taskId]);
  return { preflight, prompt, setPrompt, phase, setPhase };
}

type Preflight = ReturnType<typeof usePreflight>;

function useTerminalSender(scope: TerminalScope, load: Preflight, permissionMode: PermissionMode) {
  const [failure, setFailure] = useState<string | null>(null);
  const [opened, setOpened] = useState<TerminalOpened | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const lastExtra = useRef<TerminalExtra>(NO_EXTRA);
  const sending = useRef(false);
  async function send(extra: TerminalExtra, allowAdditional: boolean): Promise<TerminalOpened | null> {
    if (sending.current || !load.preflight) return null;
    sending.current = true;
    lastExtra.current = extra;
    load.setPhase("sending");
    setFailure(null);
    setNeedsConfirmation(false);
    try {
      const result = await openTerminal(scope, { prompt: load.prompt, requestKey: requestKey.current, allowAdditional, permissionMode, ...extra });
      setOpened(result);
      load.setPhase("opened");
      return result;
    } catch (error) {
      if (isSessionActive(error)) setNeedsConfirmation(true);
      else setFailure(failureMessage(error));
      load.setPhase("ready");
      return null;
    } finally {
      sending.current = false;
    }
  }
  return { send, lastExtra, failure, opened, needsConfirmation, setNeedsConfirmation };
}

export function useTerminalLaunch(scope: TerminalScope) {
  const load = usePreflight(scope);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const sender = useTerminalSender(scope, load, permissionMode);
  const confirm = (extra: TerminalExtra = NO_EXTRA) => sender.send(extra, false);
  const confirmAdditional = () => sender.send(sender.lastExtra.current, true);
  const declineAdditional = () => sender.setNeedsConfirmation(false);
  const promptProblem = load.preflight ? promptProblemOf(load.prompt, load.preflight.maxPromptLength) : null;
  const serviceRunning = load.preflight?.sessionService.running ?? true;
  return { preflight: load.preflight, serviceRunning, permissionMode, setPermissionMode, prompt: load.prompt, setPrompt: load.setPrompt, promptProblem, confirm, confirmAdditional, declineAdditional, needsConfirmation: sender.needsConfirmation, phase: load.phase, failure: sender.failure, opened: sender.opened };
}

export type TerminalLaunch = ReturnType<typeof useTerminalLaunch>;
