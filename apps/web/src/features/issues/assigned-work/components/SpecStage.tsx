"use client";

import { useEffect } from "react";
import { formatMoment } from "@/lib/tasks/formatMoment";
import type { TaskDetail } from "../contract";
import { useArtifactViewer } from "../hooks/useArtifactViewer";
import type { SpecItem } from "../taskSetContract";
import { SPECS_LIST_LABEL, SPEC_STAGE_LABEL } from "../taskSetCopy";
import type { TerminalScope } from "../terminalContract";
import { ArtifactViewer } from "./ArtifactViewer";
import { GenerateTasksAction } from "./GenerateTasksAction";

type Props = { scope: TerminalScope; specs: SpecItem[]; detail: TaskDetail; canGenerate: boolean; onOpened: () => Promise<void> | void };

function SpecPicker({ specs, openId, onOpen }: { specs: SpecItem[]; openId: string | null; onOpen: (artifactId: string) => void }) {
  if (specs.length < 2) return null;
  return (
    <ul aria-label={SPECS_LIST_LABEL} className="flex flex-wrap gap-2">
      {specs.map((spec) => <li key={spec.artifactId}><button type="button" aria-pressed={spec.artifactId === openId} onClick={() => onOpen(spec.artifactId)} className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-ink-2 hover:bg-ink/5 aria-pressed:bg-raised aria-pressed:text-ink aria-pressed:ring-1 aria-pressed:ring-line">{spec.path}</button></li>)}
    </ul>
  );
}

export function SpecStage({ scope, specs, detail, canGenerate, onOpened }: Props) {
  const viewer = useArtifactViewer(scope);
  const { open, artifactId } = viewer;
  const latest = specs[0] ?? null;
  useEffect(() => {
    if (latest && artifactId === null) void open(latest.artifactId);
  }, [latest, artifactId, open]);
  return (
    <section aria-label={SPEC_STAGE_LABEL} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {latest ? <time dateTime={latest.updatedAt} className="font-mono text-xs tabular-nums text-ink-3" suppressHydrationWarning>{formatMoment(latest.updatedAt)}</time> : <span />}
        {canGenerate ? <GenerateTasksAction detail={detail} specs={specs} onOpened={onOpened} /> : null}
      </div>
      <SpecPicker specs={specs} openId={artifactId} onOpen={(id) => void open(id)} />
      <ArtifactViewer viewer={viewer} closable={false} />
    </section>
  );
}
