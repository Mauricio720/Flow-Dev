import { VERSION_PICKER_LABEL, versionOptionLabel } from "../artifactCopy";

type Version = { version: number; skill: string };
type Props = { versions: Version[]; value: number; onChange: (version: number) => void };

export function ArtifactVersionPicker({ versions, value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-2">{VERSION_PICKER_LABEL}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-md border border-line bg-raised px-2 py-1.5 text-sm">
        {[...versions].reverse().map((item) => <option key={item.version} value={item.version}>{versionOptionLabel(item)}</option>)}
      </select>
    </label>
  );
}
