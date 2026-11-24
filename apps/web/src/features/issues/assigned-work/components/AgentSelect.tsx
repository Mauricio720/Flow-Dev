import { useId } from "react";

type Option = { value: string; label: string; disabled?: boolean };
type Props = { label: string; value: string; options: Option[]; onChange: (value: string) => void };

export function AgentSelect({ label, value, options, onChange }: Props) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id} className="text-xs text-ink-3">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink">
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </div>
  );
}
