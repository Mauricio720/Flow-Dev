"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputLabel } from "./loopCatalogCopy";
import type { FlowLoopOption } from "./unifiedContract";

type LoopInput = FlowLoopOption["inputs"][number];
type Props = { id: string; input: LoopInput; value: string; disabled: boolean; onChange: (value: string) => void };

const BOOLEAN_KIND = "boolean";
const CHECKED = "true";
const UNCHECKED = "false";
const SELECT_CLASS = "h-10 w-full rounded-md border border-input bg-surface px-3 text-[15px] disabled:opacity-40";

const defaultText = (input: LoopInput) => (input.defaultValue === null || input.defaultValue === undefined ? "" : String(input.defaultValue));

function BooleanField({ id, input, value, disabled, onChange }: Props) {
  const checked = (value || defaultText(input)) === CHECKED;
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
      <input id={id} type="checkbox" className="size-4 shrink-0 accent-ink disabled:opacity-40" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked ? CHECKED : UNCHECKED)} />
      {inputLabel(input.name)}
    </label>
  );
}

function ChoiceField({ id, input, value, disabled, onChange }: Props) {
  const fallback = defaultText(input);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{inputLabel(input.name)}{input.required ? " (obrigatório)" : ""}</Label>
      <select id={id} className={SELECT_CLASS} disabled={disabled} value={value || fallback} onChange={(event) => onChange(event.target.value)}>
        {!fallback && <option value="">Escolha uma opção</option>}
        {(input.enumValues ?? []).map((choice) => <option key={choice} value={choice}>{choice}{choice === fallback ? " (padrão)" : ""}</option>)}
      </select>
    </div>
  );
}

export function LoopInputField(props: Props) {
  const { id, input, value, disabled, onChange } = props;
  if (input.kind === BOOLEAN_KIND) return <BooleanField {...props} />;
  if (input.enumValues?.length) return <ChoiceField {...props} />;
  const fallback = defaultText(input);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{inputLabel(input.name)}{input.required ? " (obrigatório)" : ""}</Label>
      <Input id={id} disabled={disabled} value={value} placeholder={fallback ? `Padrão: ${fallback}` : undefined} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
