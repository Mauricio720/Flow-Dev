import { useId } from "react";

const ASSIGN_TO_SELF_LABEL = "Atribuir a mim e colocar em Ready";

type Props = { checked: boolean; onChange: (value: boolean) => void };

export function AssignToSelfOption({ checked, onChange }: Props) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-(--lane-merge)" />
      <label htmlFor={id} className="text-sm text-ink-2">{ASSIGN_TO_SELF_LABEL}</label>
    </div>
  );
}
