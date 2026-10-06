"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TaskFailure } from "../contract";
import { DRAFT_FIELD_LABEL, type DraftPath } from "../draftModel";
import { preselectedPaths, type ProposalField } from "../refinementModel";
import { failureMessage } from "../taskCopy";

const INTRO = "O Issue Author propôs mudanças no draft. Nada é alterado até você escolher os campos e aplicar.";
const CONFLICT_NOTE = "Você editou este campo manualmente. Ele não foi marcado; aplicar substitui a sua edição.";
const UNCHANGED_NOTE = "A proposta não muda nenhum campo do draft atual.";

type Props = { fields: ProposalField[]; busy: boolean; failure: TaskFailure | null; onApply: (paths: DraftPath[]) => void; onDiscard: () => void };
type FieldProps = { field: ProposalField; checked: boolean; onToggle: () => void };

function FieldDiff({ field, checked, onToggle }: FieldProps) {
  const id = useId();
  return (
    <li className="space-y-2 border-t border-line pt-3">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="size-4 accent-(--lane-merge)" />
        Aplicar {DRAFT_FIELD_LABEL[field.path]}
      </label>
      {field.manuallyEdited && <p className="text-xs text-clarify-ink">{CONFLICT_NOTE}</p>}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-ink-3">Atual</dt><dd className="[overflow-wrap:anywhere] whitespace-pre-wrap text-ink-2">{field.current}</dd></div>
        <div><dt className="text-xs text-ink-3">Proposto</dt><dd className="[overflow-wrap:anywhere] whitespace-pre-wrap">{field.proposed}</dd></div>
      </dl>
    </li>
  );
}

export function RefinementReview({ fields, busy, failure, onApply, onDiscard }: Props) {
  const [selected, setSelected] = useState<DraftPath[]>(() => preselectedPaths(fields));
  const toggle = (path: DraftPath) => setSelected((paths) => (paths.includes(path) ? paths.filter((item) => item !== path) : [...paths, path]));
  return (
    <section aria-label="Proposta de refinamento" className="space-y-3 border-t border-line bg-clarify-wash/40 px-5 py-4">
      <h4 className="text-sm font-semibold">Proposta de refinamento</h4>
      <p className="text-sm text-ink-2">{fields.length ? INTRO : UNCHANGED_NOTE}</p>
      <ul className="space-y-3">{fields.map((field) => <FieldDiff key={field.path} field={field} checked={selected.includes(field.path)} onToggle={() => toggle(field.path)} />)}</ul>
      {failure && <p role="alert" className="text-sm text-destructive">{failureMessage(failure)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || selected.length === 0} onClick={() => onApply(selected)}>Aplicar selecionados</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onDiscard}>Descartar proposta</Button>
      </div>
    </section>
  );
}
