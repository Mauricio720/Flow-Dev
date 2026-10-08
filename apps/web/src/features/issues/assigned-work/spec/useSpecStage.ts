"use client";

import { useState } from "react";
import type { TaskFailure } from "../contract";
import { blocksSpecCommands } from "./specCommandState";
import type { SpecStageName } from "./specContract";
import { useSpecInitial } from "./specInitialContext";
import { requiredStages } from "./specStageModel";
import { useSpecAnnouncement } from "./useSpecAnnouncement";
import { useSpecCommand } from "./useSpecCommand";
import { useSpecPackage } from "./useSpecPackage";
import { useSpecSnapshot } from "./useSpecSnapshot";

type Input = { projectId: string; taskId: string; onFailure: (failure: TaskFailure) => void };

export function useSpecStage(input: Input) {
  const initial = useSpecInitial();
  const target = { projectId: input.projectId, taskId: input.taskId };
  const snapshotHook = useSpecSnapshot({ ...target, initial: initial.load.kind === "ready" ? initial.load.snapshot : null, enabled: true });
  const { snapshot } = snapshotHook;
  const command = useSpecCommand({ viewerId: snapshot?.viewerId ?? "anonimo", ...target, specVersion: snapshot?.specVersion ?? 0, onChanged: snapshotHook.refresh, onFailure: input.onFailure });
  const [picked, setPicked] = useState<SpecStageName | null>(initial.selection.stage);
  const [adjustment, setAdjustment] = useState("");
  const stage = picked ?? (snapshot?.currentStage as SpecStageName | null) ?? requiredStages(snapshot?.route ?? null)[0] ?? null;
  const row = snapshot?.stages.find((item) => item.stage === stage);
  const load = useSpecPackage(target, initial.selection.packageId ?? row?.currentPackageId ?? null);
  const parent = useSpecPackage(target, load.detail?.parentPackageId ?? null);
  return { target, snapshotHook, command, stage, setPicked, adjustment, setAdjustment, load, parent, announcement: useSpecAnnouncement(snapshot), busy: blocksSpecCommands(command.command) };
}

export type SpecStageData = ReturnType<typeof useSpecStage>;
