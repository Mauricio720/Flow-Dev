import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AgentCatalog } from "@/lib/projects/contract";
import { EFFORT_LABEL, EFFORT_ORDER, providerLabel } from "../agentSettingsCopy";
import type { AgentDraft } from "../hooks/useAgentSettingsEditor";

const SELECT_CLASS = "h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-[15px] text-ink outline-none transition-colors duration-200 ease-out-expo focus:border-ring disabled:cursor-not-allowed disabled:opacity-40";

type Props = { agent: string; catalog: AgentCatalog; draft: AgentDraft; disabled: boolean; onChange: (next: Partial<AgentDraft>) => void };

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function AgentChoiceFields({ agent, catalog, draft, disabled, onChange }: Props) {
  const models = catalog[draft.provider] ?? [];
  const modelOptions = models.includes(draft.model) ? models : [draft.model, ...models];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`${agent}-provider`} label="Provedor">
        <select id={`${agent}-provider`} className={cn(SELECT_CLASS)} value={draft.provider} disabled={disabled} onChange={(event) => onChange({ provider: event.target.value as AgentDraft["provider"] })}>
          {Object.keys(catalog).map((provider) => <option key={provider} value={provider}>{providerLabel(provider)}</option>)}
        </select>
      </Field>
      <Field id={`${agent}-model`} label="Modelo">
        <select id={`${agent}-model`} className={SELECT_CLASS} value={draft.model} disabled={disabled} onChange={(event) => onChange({ model: event.target.value })}>
          {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
        </select>
      </Field>
      <Field id={`${agent}-effort`} label="Esforço">
        <select id={`${agent}-effort`} className={SELECT_CLASS} value={draft.effort} disabled={disabled} onChange={(event) => onChange({ effort: event.target.value as AgentDraft["effort"] })}>
          {EFFORT_ORDER.map((effort) => <option key={effort} value={effort}>{EFFORT_LABEL[effort]}</option>)}
        </select>
      </Field>
    </div>
  );
}
