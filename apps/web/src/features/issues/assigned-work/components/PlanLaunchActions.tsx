"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TaskDetail } from "../contract";
import type { PlanItemView } from "../planContract";
import { blockedNumbers, launchActionOf } from "../planStateModel";
import { PlanForceConfirm } from "./PlanForceConfirm";
import { TerminalLaunchDialog } from "./TerminalLaunchDialog";

type Props = { item: PlanItemView; detail: TaskDetail; onOpened: () => Promise<void> | void };
type Stage = "idle" | "confirming" | "dialog";

export function PlanLaunchActions({ item, detail, onOpened }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const action = launchActionOf(item);
  if (!action || !detail.planning.permissions.canOpenTerminal) return null;
  const close = () => setStage("idle");
  return (
    <>
      {stage === "confirming" ? <PlanForceConfirm numbers={blockedNumbers(item)} onConfirm={() => setStage("dialog")} onCancel={close} /> : <Button ref={trigger} type="button" size="sm" onClick={() => setStage(action.force ? "confirming" : "dialog")}>{action.label}</Button>}
      {stage === "dialog" && <TerminalLaunchDialog projectId={detail.task.projectId} taskId={detail.task.id} purpose={{ kind: "plan_item", planItemId: item.id, ...(action.force ? { force: true } : {}) }} trigger={trigger} onClose={close} onOpened={() => void onOpened()} />}
    </>
  );
}
