import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_QUESTION, otherTooLong, pickOption, pickOther, type QuestionState } from "../questionAnswerModel";
import type { QuestionItem } from "../sessionContract";
import { CHOICE_MULTIPLE_LABEL, CHOICE_SINGLE_LABEL, MAX_FREE_TEXT_LENGTH, OTHER_LABEL, OTHER_LIMIT_MESSAGE, OTHER_TEXT_LABEL, lengthCounter } from "../sessionCopy";
import { QuestionOption } from "./QuestionOption";

type Props = { id: string; question: QuestionItem; value: QuestionState | undefined; disabled: boolean; onChange: (next: QuestionState) => void };

function OtherAnswer({ id, question, value, disabled, onChange }: { id: string; question: QuestionItem; value: QuestionState; disabled: boolean; onChange: (next: QuestionState) => void }) {
  const label = <label htmlFor={`other-${id}`} className="text-sm text-ink-2">{OTHER_TEXT_LABEL}</label>;
  const invalid = otherTooLong(value) ? true : undefined;
  if (question.secret) return <div className="space-y-1">{label}<Input id={`other-${id}`} type="password" autoComplete="off" value={value.text} disabled={disabled} aria-invalid={invalid} onChange={(event) => onChange({ ...value, text: event.target.value })} /></div>;
  return <div className="space-y-1">{label}<Textarea id={`other-${id}`} value={value.text} disabled={disabled} aria-invalid={invalid} onChange={(event) => onChange({ ...value, text: event.target.value })} className="min-h-20" /><p className={`text-xs ${invalid ? "text-destructive" : "text-ink-3"}`}>{invalid ? OTHER_LIMIT_MESSAGE : lengthCounter(value.text.length, MAX_FREE_TEXT_LENGTH)}</p></div>;
}

export function QuestionField({ id, question, value = EMPTY_QUESTION, disabled, onChange }: Props) {
  const inputType = question.multiSelect ? "checkbox" : "radio";
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{question.question}</legend>
      <p className="text-xs text-ink-3">{question.header} · {question.multiSelect ? CHOICE_MULTIPLE_LABEL : CHOICE_SINGLE_LABEL}</p>
      {question.options.map((option) => (
        <QuestionOption key={option.label} name={id} question={question} option={option} checked={value.labels.includes(option.label)} disabled={disabled} onPick={() => onChange(pickOption(question, value, option.label))} />
      ))}
      {question.allowOther !== false ? <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-ink-3"><input type={inputType} name={id} value="__other__" checked={value.other} disabled={disabled} onChange={() => onChange(pickOther(question, value))} className="mt-1 size-4 accent-primary" /><span className="block font-medium text-ink">{OTHER_LABEL}</span></label> : null}
      {value.other && question.allowOther !== false ? <OtherAnswer id={id} question={question} value={value} disabled={disabled} onChange={onChange} /> : null}
    </fieldset>
  );
}
