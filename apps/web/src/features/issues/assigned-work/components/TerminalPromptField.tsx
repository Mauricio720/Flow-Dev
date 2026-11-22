import { Textarea } from "@/components/ui/textarea";
import type { PromptProblem } from "../terminalContract";
import { PROMPT_LABEL, PROMPT_LIMIT_MESSAGE, characterCounter } from "../terminalCopy";

type Props = { value: string; maxLength: number; problem: PromptProblem; disabled: boolean; onChange: (value: string) => void };

const FIELD_ID = "terminal-prompt";
const COUNTER_ID = "terminal-prompt-counter";

export function TerminalPromptField({ value, maxLength, problem, disabled, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label htmlFor={FIELD_ID} className="text-sm font-medium">{PROMPT_LABEL}</label>
      <Textarea id={FIELD_ID} value={value} disabled={disabled} aria-invalid={problem ? true : undefined} aria-describedby={COUNTER_ID} onChange={(event) => onChange(event.target.value)} className="max-h-[40vh] min-h-40 font-mono text-sm" />
      <div id={COUNTER_ID} aria-live="polite" className="flex flex-wrap justify-between gap-2 text-xs text-ink-3">
        <span className={problem ? "text-destructive" : undefined}>{problem ? PROMPT_LIMIT_MESSAGE : ""}</span>
        <span>{characterCounter(value.length, maxLength)}</span>
      </div>
    </div>
  );
}
