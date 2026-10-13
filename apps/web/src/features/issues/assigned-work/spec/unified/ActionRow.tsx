"use client";

import { Button } from "@/components/ui/button";
import { ActionSummary } from "./ActionSummary";
import { loopDescription, loopTitle } from "./loopCatalogCopy";
import { LoopFields } from "./LoopFields";
import { RuntimePicker } from "./RuntimePicker";
import { WorkspacePicker } from "./WorkspacePicker";
import { PreparationFailure, type LocalPreparation } from "./PreparationFailure";
import { RETRY_COPY } from "./stageCopy";
import { ACTION_DESCRIPTIONS, ACTION_LABELS, DOCUMENTS_LANGUAGE_LABEL, LANGUAGE_FIELD_LABELS, LOCAL_ONLY_NOTES, RUN_STATE_LABELS, START_REASONS } from "./unifiedCopy";
import type { DocumentLanguage, DraftAction, DraftLoop, DraftRuntime, DraftWorkspace, FlowAction, FlowOptions } from "./unifiedContract";

const RETRYABLE_STATES = ["failed", "canceled", "blocked"];
const DIRECT_KIND = "direct_execute";
const WORKSPACE_RUNTIME_MESSAGE = "Esta conexão não pode executar neste checkout.";

function hasRuntimeWorkspaceMismatch(draft: DraftAction, options: FlowOptions) {
  const expectedTarget = draft.workspace.kind === "local" ? "machine" : "host";
  const runtimes = draft.kind === "loop" ? Object.values(draft.loop?.runtimes ?? {}) : [draft.runtime];
  return runtimes.some((runtime) => runtime && options.connections.find((connection) => connection.id === runtime.connectionId)?.executionTarget !== expectedTarget);
}

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
  preparation?: LocalPreparation;
  resumedInNow?: boolean;
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
  const direct = draft.kind === DIRECT_KIND;
  const localOnlyNote = LOCAL_ONLY_NOTES[draft.kind];
  const runtimeMismatch = hasRuntimeWorkspaceMismatch(draft, options);
  const locked = !!saved && saved.state !== "planned";
  const startReason = local ? options.localStartReason : options.startReason;
  const reason = hint({ saved, planDirty: props.planDirty, startReason });
  const loopOption = draft.loop ? options.loops.find((item) => item.name === draft.loop?.name) ?? null : null;
  const preparationPending = !!props.preparation && ["queued", "leased", "accepted"].includes(props.preparation.state);
  if (saved && locked && !retryable) return <ActionSummary index={index} label={label} action={saved} />;
  if (saved && retryable && props.resumedInNow) return <ActionSummary index={index} label={label} action={saved} note={RETRY_COPY.resumeAbove} />;
  const startBlocked = (reason !== null && !(retryable && !props.planDirty && !startReason)) || (local && props.preparation?.state !== "ready") || runtimeMismatch;
  return (
    <li className="space-y-3 py-4">
      <div>
        <h4 className="text-[15px] font-semibold">{index + 1}. {label}</h4>
        <p className="mt-1 text-sm text-ink-2">{draft.kind === "loop" ? loopDescription(draft.loop?.name ?? "", loopOption?.description ?? "Loop da definição ao vivo do CompozyOS.") : ACTION_DESCRIPTIONS[draft.kind]}</p>
      </div>
      {draft.kind === "loop" && draft.loop ? <LoopFields idPrefix={`action-${index}`} option={loopOption} loop={draft.loop} connections={options.connections} workspaceKind={draft.workspace.kind} disabled={locked || busy} onChange={props.onLoop} /> : <>
        <label className="block max-w-xs space-y-1.5 text-sm" htmlFor={`action-${index}-language`}><span className="font-medium">{LANGUAGE_FIELD_LABELS[draft.kind] ?? DOCUMENTS_LANGUAGE_LABEL}</span>
          <select id={`action-${index}-language`} className="h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40" value={draft.language} disabled={locked || busy} onChange={(event) => props.onLanguage(event.target.value as DocumentLanguage)}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </label>
        <RuntimePicker idPrefix={`action-${index}`} connections={options.connections} value={draft.runtime} workspaceKind={draft.workspace.kind} disabled={locked || busy} onChange={props.onRuntime} />
      </>}
      {runtimeMismatch && <p className="text-sm text-destructive" role="alert">{WORKSPACE_RUNTIME_MESSAGE} Conexões locais exigem o Projeto local vinculado; worktrees exigem uma conexão do servidor.</p>}
      <WorkspacePicker idPrefix={`action-${index}`} value={draft.workspace} worktrees={options.worktrees} localAvailable={options.workspaces.some((item) => item.kind === "local")} managedAvailable={options.managedWorktreesAvailable} disabled={locked || busy} implementation={draft.kind === "loop" && draft.loop?.name === "implement-tasks"} localOnly={direct || !!localOnlyNote} localOnlyNote={localOnlyNote} label={direct || !localOnlyNote ? undefined : "Checkout"} onChange={props.onWorkspace} />
      <div className="flex flex-wrap items-center gap-3">
        {saved?.state === "planned" && !direct && <Button type="button" variant="outline" disabled={busy} onClick={props.onRemove}>Remover ação</Button>}
        {local && saved && (saved.state === "planned" || retryable) && props.preparation?.state !== "ready" && <Button type="button" variant="outline" disabled={busy || props.planDirty || preparationPending} onClick={() => props.onPrepare(saved.id)}>{preparationPending ? "Preparação em andamento" : props.preparation ? "Preparar novamente" : "Preparar ação local"}</Button>}
        {draft.kind === "loop" && loopOption && loopOption.version !== draft.loop?.version && saved?.state === "planned" && <Button type="button" variant="outline" disabled={busy} onClick={props.onRenewLoop}>Atualizar definição do Loop</Button>}
        <Button type="button" variant={startBlocked ? "outline" : "default"} disabled={busy || startBlocked} onClick={() => saved && (retryable ? props.onRetry(saved.id) : props.onStart(saved.id))}>{retryable ? `Tentar ${label} de novo com os mesmos runtimes` : `Iniciar ${label}`}</Button>
        {local && props.preparation?.state === "ready" && <div className="text-sm text-ink-2" role="status">
          <p>Preparação atual para {props.preparation.safeLabel ?? "checkout local"}. {props.preparation.dirty ? "Há alterações locais não commitadas; elas serão preservadas." : "Checkout sem alterações locais."}</p>
          {props.preparation.requiredGates?.length ? <ul className="mt-1 list-disc pl-5" aria-label="Verificações obrigatórias">{props.preparation.requiredGates.map((gate) => <li key={gate.id}>{gate.label}</li>)}</ul> : <p className="mt-1">Nenhuma verificação obrigatória foi identificada para esta ação.</p>}
          {props.preparation.capabilities?.length ? <p className="mt-1">Recursos locais: {props.preparation.capabilities.join(", ")}.</p> : null}
        </div>}
        {local && <PreparationFailure preparation={props.preparation} />}
        {reason && !retryable && <p className="text-sm text-ink-2">{reason}</p>}
      </div>
    </li>
  );
}
