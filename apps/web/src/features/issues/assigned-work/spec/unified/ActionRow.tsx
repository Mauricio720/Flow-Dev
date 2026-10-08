"use client";

import { Button } from "@/components/ui/button";
import { ActionSummary } from "./ActionSummary";
import { loopDescription, loopTitle } from "./loopCatalogCopy";
import { LoopFields } from "./LoopFields";
import { RuntimePicker } from "./RuntimePicker";
import { WorkspacePicker } from "./WorkspacePicker";
import { ACTION_DESCRIPTIONS, ACTION_LABELS, PREPARATION_FAILED_STATES, PREPARATION_FAILURES, PREPARATION_FAILURE_FALLBACK, RUN_STATE_LABELS, START_REASONS } from "./unifiedCopy";
import type { DocumentLanguage, DraftAction, DraftLoop, DraftRuntime, DraftWorkspace, FlowAction, FlowOptions } from "./unifiedContract";

const RETRYABLE_STATES = ["failed", "canceled", "blocked"];

export type ActionRowProps = {
  index: number;
  draft: DraftAction;
  saved: FlowAction | null;
  options: FlowOptions;
  planDirty: boolean;
  busy: boolean;
  onRuntime: (runtime: DraftRuntime | null) => void;
  onLanguage: (language: DocumentLanguage) => void;
  onWorkspace: (workspace: DraftWorkspace) => void;
  onLoop: (loop: DraftLoop) => void;
  onRemove: () => void;
  onRenewLoop: () => void;
  onStart: (actionId: string) => void;
  onRetry: (actionId: string) => void;
  onPrepare: (actionId: string) => void;
  preparation?: { id: string; state: string; reason?: string | null; detail?: string | null; safeLabel?: string; dirty?: boolean | null; capabilities?: string[]; requiredGates?: { id: string; label: string; kind: "command" | "playwright" }[] };
};

function hint(input: { saved: FlowAction | null; planDirty: boolean; startReason: string | null }) {
  if (!input.saved) return "Salve o fluxo para poder iniciar esta ação.";
  if (input.planDirty) return "Há alterações não salvas. Salve o fluxo antes de iniciar.";
  if (input.saved.state !== "planned" && !RETRYABLE_STATES.includes(input.saved.state)) return `Estado: ${RUN_STATE_LABELS[input.saved.state] ?? input.saved.state}.`;
  return input.startReason ? START_REASONS[input.startReason] ?? "Não é possível iniciar agora." : null;
}

export function ActionRow(props: ActionRowProps) {
  const { index, draft, saved, options, busy } = props;
  const label = draft.kind === "loop" ? loopTitle(draft.loop?.name ?? "") : ACTION_LABELS[draft.kind];
  const retryable = !!saved && RETRYABLE_STATES.includes(saved.state);
  const local = draft.workspace.kind === "local";
  const locked = !!saved && saved.state !== "planned";
  const startReason = local ? options.localStartReason : options.startReason;
  const reason = hint({ saved, planDirty: props.planDirty, startReason });
  const loopOption = draft.loop ? options.loops.find((item) => item.name === draft.loop?.name) ?? null : null;
  const preparationPending = !!props.preparation && ["queued", "leased", "accepted"].includes(props.preparation.state);
  if (saved && locked && !retryable) return <ActionSummary index={index} label={label} action={saved} />;
  const startBlocked = (reason !== null && !(retryable && !props.planDirty && !startReason)) || (local && props.preparation?.state !== "ready");
  return (
    <li className="space-y-3 py-4">
      <div>
        <h4 className="text-[15px] font-semibold">{index + 1}. {label}</h4>
        <p className="mt-1 text-sm text-ink-2">{draft.kind === "loop" ? loopDescription(draft.loop?.name ?? "", loopOption?.description ?? "Loop da definição ao vivo do CompozyOS.") : ACTION_DESCRIPTIONS[draft.kind]}</p>
      </div>
      {draft.kind === "loop" && draft.loop ? <LoopFields idPrefix={`action-${index}`} option={loopOption} loop={draft.loop} connections={options.connections} disabled={locked || busy} onChange={props.onLoop} /> : <>
        <label className="block max-w-xs space-y-1.5 text-sm" htmlFor={`action-${index}-language`}><span className="font-medium">Idioma dos documentos</span>
          <select id={`action-${index}-language`} className="h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40" value={draft.language} disabled={locked || busy} onChange={(event) => props.onLanguage(event.target.value as DocumentLanguage)}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </label>
        <RuntimePicker idPrefix={`action-${index}`} connections={options.connections} value={draft.runtime} disabled={locked || busy} onChange={props.onRuntime} />
      </>}
      <WorkspacePicker idPrefix={`action-${index}`} value={draft.workspace} worktrees={options.worktrees} localAvailable={options.workspaces.some((item) => item.kind === "local")} managedAvailable={options.managedWorktreesAvailable} disabled={locked || busy} implementation={draft.kind === "loop" && draft.loop?.name === "implement-tasks"} onChange={props.onWorkspace} />
      <div className="flex flex-wrap items-center gap-3">
        {saved?.state === "planned" && <Button type="button" variant="outline" disabled={busy} onClick={props.onRemove}>Remover ação</Button>}
        {local && saved && (saved.state === "planned" || retryable) && props.preparation?.state !== "ready" && <Button type="button" variant="outline" disabled={busy || props.planDirty || preparationPending} onClick={() => props.onPrepare(saved.id)}>{preparationPending ? "Preparação em andamento" : props.preparation ? "Preparar novamente" : "Preparar ação local"}</Button>}
        {draft.kind === "loop" && loopOption && loopOption.version !== draft.loop?.version && saved?.state === "planned" && <Button type="button" variant="outline" disabled={busy} onClick={props.onRenewLoop}>Atualizar definição do Loop</Button>}
        <Button type="button" variant={startBlocked ? "outline" : "default"} disabled={busy || startBlocked} onClick={() => saved && (retryable ? props.onRetry(saved.id) : props.onStart(saved.id))}>{retryable ? `Tentar ${label} de novo com os mesmos runtimes` : `Iniciar ${label}`}</Button>
        {local && props.preparation?.state === "ready" && <div className="text-sm text-ink-2" role="status">
          <p>Preparação atual para {props.preparation.safeLabel ?? "checkout local"}. {props.preparation.dirty ? "Há alterações locais não commitadas; elas serão preservadas." : "Checkout sem alterações locais."}</p>
          {props.preparation.requiredGates?.length ? <ul className="mt-1 list-disc pl-5" aria-label="Verificações obrigatórias">{props.preparation.requiredGates.map((gate) => <li key={gate.id}>{gate.label}</li>)}</ul> : <p className="mt-1">Nenhuma verificação obrigatória foi identificada para esta ação.</p>}
          {props.preparation.capabilities?.length ? <p className="mt-1">Recursos locais: {props.preparation.capabilities.join(", ")}.</p> : null}
        </div>}
        {local && props.preparation && PREPARATION_FAILED_STATES.includes(props.preparation.state) && <p className="text-sm text-destructive" role="alert">{PREPARATION_FAILURES[props.preparation.reason ?? ""] ?? PREPARATION_FAILURE_FALLBACK}{props.preparation.detail ? <span className="mt-1 block whitespace-pre-wrap break-words text-ink-2">{props.preparation.detail}</span> : null}</p>}
        {reason && !retryable && <p className="text-sm text-ink-2">{reason}</p>}
      </div>
    </li>
  );
}
