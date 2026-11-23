import { Textarea } from "@/components/ui/textarea";
import { EMPTY_QUESTION, otherTooLong, pickOption, pickOther, type QuestionState } from "../questionAnswerModel";
import type { QuestionItem } from "../sessionContract";
import { CHOICE_MULTIPLE_LABEL, CHOICE_SINGLE_LABEL, MAX_FREE_TEXT_LENGTH, OTHER_LABEL, OTHER_LIMIT_MESSAGE, OTHER_TEXT_LABEL, lengthCounter } from "../sessionCopy";
import { QuestionOption } from "./QuestionOption";

type Props = { question: QuestionItem; value: QuestionState | undefined; disabled: boolean; onChange: (next: QuestionState) => void };

export function QuestionField({ question, value = EMPTY_QUESTION, disabled, onChange }: Props) {
  const inputType = question.multiSelect ? "checkbox" : "radio";
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{question.question}</legend>
      <p className="text-xs text-ink-3">{question.header} · {question.multiSelect ? CHOICE_MULTIPLE_LABEL : CHOICE_SINGLE_LABEL}</p>
      {question.options.map((option) => (
        <QuestionOption key={option.label} question={question} option={option} checked={value.labels.includes(option.label)} disabled={disabled} onPick={() => onChange(pickOption(question, value, option.label))} />
      ))}
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-ink-3">
        <input type={inputType} name={question.question} value="__other__" checked={value.other} disabled={disabled} onChange={() => onChange(pickOther(question, value))} className="mt-1 size-4 accent-primary" />
        <span className="block font-medium text-ink">{OTHER_LABEL}</span>
      </label>
      {value.other && (
        <div className="space-y-1">
          <label htmlFor={`other-${question.question}`} className="text-sm text-ink-2">{OTHER_TEXT_LABEL}</label>
          <Textarea id={`other-${question.question}`} value={value.text} disabled={disabled} aria-invalid={otherTooLong(value) ? true : undefined} onChange={(event) => onChange({ ...value, text: event.target.value })} className="min-h-20" />
          <p className={`text-xs ${otherTooLong(value) ? "text-destructive" : "text-ink-3"}`}>{otherTooLong(value) ? OTHER_LIMIT_MESSAGE : lengthCounter(value.text.length, MAX_FREE_TEXT_LENGTH)}</p>
        </div>
      )}
    </fieldset>
  );
}
