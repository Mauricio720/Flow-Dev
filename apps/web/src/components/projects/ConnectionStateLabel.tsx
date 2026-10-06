import type { ConnectionKind } from "@/lib/projects/contract";
import { cn } from "@/lib/utils";
import { CONNECTION_PRESENTATION, CONNECTION_TONE_CLASS } from "./connectionPresentation";

type Props = { kind: ConnectionKind; id?: string; className?: string };

export function ConnectionStateLabel({ kind, id, className }: Props) {
  const presentation = CONNECTION_PRESENTATION[kind];
  const tone = CONNECTION_TONE_CLASS[presentation.tone];
  return (
    <span id={id} className={cn("inline-flex items-center gap-2 text-xs", tone.text, className)}>
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", tone.dot)} />
      {presentation.label}
    </span>
  );
}
