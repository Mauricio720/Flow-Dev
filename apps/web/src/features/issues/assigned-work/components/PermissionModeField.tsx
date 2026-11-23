import type { PermissionMode } from "../terminalContract";
import { PERMISSION_MODE_LEGEND, PERMISSION_MODE_OPTIONS } from "../terminalCopy";

type Props = { value: PermissionMode; disabled: boolean; onChange: (mode: PermissionMode) => void };

export function PermissionModeField({ value, disabled, onChange }: Props) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium text-ink">{PERMISSION_MODE_LEGEND}</legend>
      {PERMISSION_MODE_OPTIONS.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-ink-3">
          <input type="radio" name="permission-mode" value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="mt-1 size-4 accent-primary" />
          <span className="space-y-0.5">
            <span className="block font-medium text-ink">{option.label}</span>
            <span className="block text-ink-2">{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
