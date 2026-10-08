"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DraftWorkspace, FlowWorktreeOption } from "./unifiedContract";

const REASONS: Record<string, string> = { pending: "em criação", foreign_repository: "outro repositório", dirty: "alterações pendentes", missing: "ausente", failed: "falhou" };
const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40";

type Props = { idPrefix: string; value: DraftWorkspace; worktrees: FlowWorktreeOption[]; localAvailable: boolean; managedAvailable: boolean; disabled: boolean; implementation?: boolean; onChange: (value: DraftWorkspace) => void };

export function WorkspacePicker({ idPrefix, value, worktrees, localAvailable, managedAvailable, disabled, implementation, onChange }: Props) {
  const pickKind = (kind: string) => onChange(kind === "existing" ? { kind: "existing", worktreeId: "" } : kind === "new" ? { kind: "new", name: "" } : kind === "local" ? { kind: "local" } : { kind: "isolated" });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-workspace`}>{implementation ? "Onde implementar?" : "Checkout"}</Label>
        <select id={`${idPrefix}-workspace`} className={SELECT_CLASS} disabled={disabled} value={value.kind} onChange={(event) => pickKind(event.target.value)}>
          {value.kind === "unselected" && <option value="unselected" disabled>Escolha um checkout ou worktree</option>}
          <option value="isolated">Checkout isolado</option>
          <option value="local" disabled={!localAvailable}>Projeto local vinculado{localAvailable ? "" : " (não configurado)"}</option>
          <option value="existing" disabled={worktrees.length === 0}>Worktree existente{worktrees.length === 0 ? " (nenhum disponível)" : ""}</option>
          <option value="new" disabled={!managedAvailable}>Novo worktree gerenciado{managedAvailable ? "" : " (indisponível)"}</option>
        </select>
      </div>
      {implementation && value.kind === "unselected" && <p className="sm:col-span-2 text-sm leading-6 text-ink-2">Escolha onde o agente vai alterar o código. Você pode criar um worktree gerenciado, usar um existente ou escolher outro checkout antes de salvar.</p>}
      {implementation && value.kind === "new" && <p className="sm:col-span-2 text-sm leading-6 text-ink-2">O novo worktree será criado quando a implementação começar.</p>}
      {value.kind === "local" && <p className="sm:col-span-2 rounded-md border border-lane-clarify bg-lane-clarify-wash px-3 py-2 text-sm leading-6 text-ink-2">A execução usa os arquivos da máquina, incluindo alterações não versionadas e .env. O agente pode ler e modificar este projeto. Serviços em localhost ainda precisam estar acessíveis ao container.</p>}
      {!localAvailable && <p className="sm:col-span-2 text-xs leading-5 text-ink-3">Para usar uma pasta da máquina, o operador precisa vincular ao servidor a raiz Git deste projeto.</p>}
      {value.kind === "existing" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-worktree`}>Worktree</Label>
          <select id={`${idPrefix}-worktree`} className={SELECT_CLASS} disabled={disabled} value={value.worktreeId} onChange={(event) => onChange({ kind: "existing", worktreeId: event.target.value })}>
            <option value="">Escolha um worktree</option>
            {worktrees.map((item) => <option key={item.id} value={item.id} disabled={!item.selectable}>{item.name}{item.selectable ? "" : ` (${REASONS[item.reason ?? ""] ?? "indisponível"})`}</option>)}
          </select>
        </div>
      )}
      {value.kind === "new" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-worktree-name`}>Nome do novo worktree</Label>
          <Input id={`${idPrefix}-worktree-name`} disabled={disabled} value={value.name} onChange={(event) => onChange({ kind: "new", name: event.target.value })} />
        </div>
      )}
    </div>
  );
}
