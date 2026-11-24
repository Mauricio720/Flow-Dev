"use client";

import { useEffect, useRef, useState } from "react";
import { previewPurposeOf, type PurposeKey } from "../launchPurposeModel";
import { fetchTerminalPreflight } from "../terminalClient";
import type { TerminalPhase, TerminalPreflight, TerminalScope } from "../terminalContract";

export function useLaunchPreflight(scope: TerminalScope, key: PurposeKey) {
  const [preflight, setPreflight] = useState<TerminalPreflight | null>(null);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<TerminalPhase>("loading");
  const promptEdited = useRef(false);
  const { projectId, taskId } = scope;
  const { kind, planItemId, specId, force, choice } = key;
  const choiceAgent = choice?.agent;
  const choiceModel = choice?.model;
  const choiceEffort = choice?.effort;
  const setEditedPrompt = (value: string) => { promptEdited.current = true; setPrompt(value); };
  useEffect(() => {
    let active = true;
    const selectedChoice = choiceAgent && choiceModel && choiceEffort ? { agent: choiceAgent, model: choiceModel, effort: choiceEffort } : null;
    fetchTerminalPreflight({ projectId, taskId }, previewPurposeOf({ kind, planItemId, specId, force, choice: selectedChoice })).then((result) => {
      if (!active) return;
      setPreflight(result);
      if (!promptEdited.current) setPrompt(result.prompt);
      setPhase("ready");
    }, () => active && setPhase("load_failed"));
    return () => { active = false; };
  }, [projectId, taskId, kind, planItemId, specId, force, choiceAgent, choiceModel, choiceEffort]);
  return { preflight, prompt, setPrompt: setEditedPrompt, phase, setPhase };
}

export type LaunchPreflight = ReturnType<typeof useLaunchPreflight>;
