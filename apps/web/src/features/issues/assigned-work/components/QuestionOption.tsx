import { renderArtifactMarkdown } from "../artifactMarkdown";
import type { QuestionItem } from "../sessionContract";

type Props = { name: string; question: QuestionItem; option: QuestionItem["options"][number]; checked: boolean; disabled: boolean; onPick: () => void };

export function QuestionOption({ name, question, option, checked, disabled, onPick }: Props) {
  const inputType = question.multiSelect ? "checkbox" : "radio";
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-ink-3">
      <input type={inputType} name={name} value={option.label} checked={checked} disabled={disabled} onChange={onPick} className="mt-1 size-4 accent-primary" />
      <span className="min-w-0 space-y-1">
        <span className="block font-medium text-ink">{option.label}</span>
        {option.description && <span className="block text-ink-2">{option.description}</span>}
        {option.preview && <span className="block overflow-auto rounded-md border border-line bg-surface p-2 font-mono text-xs text-ink-2" dangerouslySetInnerHTML={{ __html: renderArtifactMarkdown(option.preview) }} />}
      </span>
    </label>
  );
}
