"use client";

import { Label } from "@/components/ui/label";
import { WORKSPACE_KIND_LABELS } from "./retryWorkspace";
import type { MovableWorkspaceKind } from "./unifiedContract";

const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40 sm:max-w-xs";
const MOVED_NOTE = "A ação passa a rodar neste checkout a partir desta tentativa, e a troca fica salva no fluxo. Escolha os runtimes de novo: cada checkout tem as suas conexões.";

type Props = { id: string; kinds: MovableWorkspaceKind[]; value: string; moved: boolean; disabled: boolean; onChange: (kind: string) => void };

export function RetryWorkspaceField({ id, kinds, value, moved, disabled, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Onde executar</Label>
      <select id={id} className={SELECT_CLASS} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {kinds.map((kind) => <option key={kind} value={kind}>{WORKSPACE_KIND_LABELS[kind]}</option>)}
      </select>
      {moved && <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{MOVED_NOTE}</p>}
    </div>
  );
}
