"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GENERATE_TASKS_LABEL, REGENERATE_TASKS_LABEL } from "../agentChoiceCopy";
import type { TaskDetail } from "../contract";
import type { SpecItem } from "../taskSetContract";
import { specsOfFolderFirst } from "../taskSetModel";
import { RegenerateTasksConfirm } from "./RegenerateTasksConfirm";
import { TerminalLaunchDialog } from "./TerminalLaunchDialog";

type Props = { detail: TaskDetail; specs: SpecItem[]; onOpened: () => Promise<void> | void; regenerate?: { folder: string } };
type Stage = "idle" | "confirming" | "dialog";

export function GenerateTasksAction({ detail, specs, onOpened, regenerate }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  if (specs.length === 0 || !detail.planning.permissions.canOpenTerminal) return null;
  const close = () => setStage("idle");
  const offered = regenerate ? specsOfFolderFirst(specs, regenerate.folder) : specs;
  return (
    <>
      {stage === "confirming" && regenerate ? <RegenerateTasksConfirm folder={regenerate.folder} onConfirm={() => setStage("dialog")} onCancel={close} /> : <Button ref={trigger} type="button" size="sm" onClick={() => setStage(regenerate ? "confirming" : "dialog")}>{regenerate ? REGENERATE_TASKS_LABEL : GENERATE_TASKS_LABEL}</Button>}
      {stage === "dialog" && <TerminalLaunchDialog projectId={detail.task.projectId} taskId={detail.task.id} purpose={{ kind: "generate_tasks", specs: offered }} trigger={trigger} onClose={close} onOpened={() => void onOpened()} />}
    </>
  );
}
