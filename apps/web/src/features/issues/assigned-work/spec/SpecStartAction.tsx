"use client";

import { Button } from "@/components/ui/button";
import type { SpecRequest } from "./specCommandState";
import type { SpecSnapshot, SpecStageName } from "./specContract";
import { STAGE_START_LABEL } from "./specCopy";
import { reasonMessage } from "../taskCopy";
import { unavailableStartNote } from "./specStageModel";

type Props = { snapshot: SpecSnapshot; busy: boolean; onRequest: (request: SpecRequest) => void };

export function SpecStartAction({ snapshot, busy, onRequest }: Props) {
  const next = snapshot.permissions.nextStartableStage as SpecStageName | null;
  const note = unavailableStartNote(snapshot);
  const blocker = snapshot.blockers[0];
  if (!next) return note ? <p role="status" className="text-sm text-ink-2">{note}</p> : blocker ? <p role="status" className="text-sm text-destructive">{reasonMessage(blocker)}</p> : null;
  return <Button type="button" size="sm" disabled={busy || !snapshot.permissions.canStart} onClick={() => onRequest({ action: "spec.start", stage: next })}>{STAGE_START_LABEL[next]}</Button>;
}
