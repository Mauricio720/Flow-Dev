"use client";

import type { NextStep } from "./nextStep";
import { NextStepNote } from "./NextStepNote";
import { OVERVIEW_NOTE } from "./overviewCopy";
import type { OpenSource } from "./overviewTypes";
import type { PackageProjection } from "./packageOverview";
import { ChangesNote, WarningsNote, type VersionChanges } from "./ProjectionNotes";
import { SpecOverviewView } from "./SpecOverviewView";
import { TaskOverviewView } from "./TaskOverviewView";

type Props = { projection: PackageProjection; next: NextStep | null; changes: VersionChanges | null; onOpenSource: OpenSource; onOpenDocument: (path: string) => void };

export function PackageOverviewPanel({ projection, next, changes, ...handlers }: Props) {
  return (
    <div className="space-y-6">
      {next && <NextStepNote next={next} />}
      {projection.kind === "spec" ? <SpecOverviewView overview={projection.view.overview} {...handlers} /> : <TaskOverviewView overview={projection.overview} {...handlers} />}
      {changes && <ChangesNote changes={changes} />}
      {projection.kind === "spec" && <WarningsNote warnings={projection.view.validationWarnings} />}
      <p className="border-t border-line pt-4 text-xs leading-5 text-ink-3">{OVERVIEW_NOTE}</p>
    </div>
  );
}
