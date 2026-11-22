"use client";

import { useEffect, useRef, useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import { fetchTerminalPreflight, openTerminal } from "../terminalClient";
import type { PromptProblem, TerminalExtra, TerminalOpened, TerminalPhase, TerminalPreflight, TerminalScope } from "../terminalContract";
import { OPEN_FAILED_MESSAGE } from "../terminalCopy";

const NO_EXTRA: TerminalExtra = { attachmentIds: [], issueImageIds: [] };

export function promptProblemOf(prompt: string, maxLength: number): PromptProblem {
  if (prompt.trim().length === 0) return "empty";
  return prompt.length > maxLength ? "too_long" : null;
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

export function useTerminalLaunch(scope: TerminalScope) {
  const load = usePreflight(scope);
  const [failure, setFailure] = useState<string | null>(null);
  const [opened, setOpened] = useState<TerminalOpened | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const sending = useRef(false);
  async function confirm(extra: TerminalExtra = NO_EXTRA): Promise<TerminalOpened | null> {
    if (sending.current || !load.preflight) return null;
    sending.current = true;
    load.setPhase("sending");
    setFailure(null);
    try {
      const result = await openTerminal(scope, { prompt: load.prompt, requestKey: requestKey.current, ...extra });
      setOpened(result);
      load.setPhase("opened");
      return result;
    } catch (error) {
      setFailure(failureMessage(error));
      load.setPhase("ready");
      return null;
    } finally {
      sending.current = false;
    }
  }
  const promptProblem = load.preflight ? promptProblemOf(load.prompt, load.preflight.maxPromptLength) : null;
  return { preflight: load.preflight, prompt: load.prompt, setPrompt: load.setPrompt, promptProblem, confirm, phase: load.phase, failure, opened };
}

export type TerminalLaunch = ReturnType<typeof useTerminalLaunch>;
