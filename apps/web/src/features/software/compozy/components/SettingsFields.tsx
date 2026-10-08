import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACTION_OPTIONS = [1, 2, 3, 4];

export type Draft = { enabled: boolean; docsProxyUrl: string; maxActiveActions: number };
type Props = { draft: Draft; fieldErrors: Record<string, string>; onChange: (patch: Partial<Draft>) => void };

export function SettingsFields({ draft, fieldErrors, onChange }: Props) {
  return (
    <>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={draft.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} className="size-4" />
        Habilitar Software CompozyOS
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="docs-proxy">URL HTTPS do proxy de documentação</Label>
        <Input id="docs-proxy" value={draft.docsProxyUrl} onChange={(event) => onChange({ docsProxyUrl: event.target.value })} aria-invalid={!!fieldErrors.docsProxyUrl} aria-describedby="docs-proxy-error" inputMode="url" />
        <p id="docs-proxy-error" className="min-h-4 text-xs text-destructive">{fieldErrors.docsProxyUrl}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="max-actions">Ações ativas simultâneas</Label>
        <select id="max-actions" value={draft.maxActiveActions} onChange={(event) => onChange({ maxActiveActions: Number(event.target.value) })} className="h-10 rounded-md border border-input bg-surface px-3 text-[15px]">
          {ACTION_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <p className="min-h-4 text-xs text-destructive">{fieldErrors.maxActiveActions}</p>
      </div>
    </>
  );
}
