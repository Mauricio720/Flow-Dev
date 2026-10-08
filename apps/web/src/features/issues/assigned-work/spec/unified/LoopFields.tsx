"use client";

import { runtimeRoleLabel } from "./loopCatalogCopy";
import { LoopInputField } from "./LoopInputField";
import { TASK_TARGET_INPUTS } from "./loopNames";
import { RuntimePicker } from "./RuntimePicker";
import type { DraftLoop, FlowConnection, FlowLoopOption } from "./unifiedContract";

type Props = { idPrefix: string; option: FlowLoopOption | null; loop: DraftLoop; connections: FlowConnection[]; disabled: boolean; onChange: (loop: DraftLoop) => void };
type LoopInput = FlowLoopOption["inputs"][number];

const ADVANCED_KINDS = ["agent"];
const ADVANCED_NAMES = ["reviewed_worktree"];
const isAdvanced = (input: LoopInput) => !input.required && (ADVANCED_KINDS.includes(input.kind) || ADVANCED_NAMES.includes(input.name));

export function LoopFields({ idPrefix, option, loop, connections, disabled, onChange }: Props) {
  const roles = option?.runtimeRoles ?? Object.keys(loop.runtimes);
  const shown = option?.inputs.filter((input) => input.name !== TASK_TARGET_INPUTS[option.name]) ?? [];
  const field = (input: LoopInput) => <LoopInputField key={input.name} id={`${idPrefix}-input-${input.name}`} input={input} value={loop.inputs[input.name] ?? ""} disabled={disabled} onChange={(value) => onChange({ ...loop, inputs: { ...loop.inputs, [input.name]: value } })} />;
  const advanced = shown.filter(isAdvanced);
  return (
    <div className="space-y-3">
      {option && option.version !== loop.version && <p role="alert" className="text-sm text-destructive">A definição ao vivo mudou para a versão {option.version}. Atualize a definição para substituir esta versão e revisar os campos declarados.</p>}
      {shown.filter((input) => !isAdvanced(input)).map(field)}
      {roles.map((role) => (
        <fieldset key={role} className="space-y-2">
          <legend className="text-sm font-medium">Runtime: {runtimeRoleLabel(role)}</legend>
          <RuntimePicker idPrefix={`${idPrefix}-${role}`} connections={connections} value={loop.runtimes[role] ?? null} disabled={disabled} onChange={(runtime) => onChange({ ...loop, runtimes: { ...loop.runtimes, [role]: runtime } })} />
        </fieldset>
      ))}
      {advanced.length > 0 && <details className="rounded-md border border-line px-3 py-2"><summary className="cursor-pointer text-sm font-medium text-ink-2">Opções avançadas</summary><div className="mt-3 space-y-3">{advanced.map(field)}</div></details>}
    </div>
  );
}
