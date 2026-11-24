import { useId } from "react";
import { AGENT_FIELD_LABEL, EFFORT_FIELD_LABEL, MODEL_FIELD_LABEL, UNAVAILABLE_SUFFIX, agentChoiceLabel, agentLabel, effortLabel, modelLabel } from "../agentChoiceCopy";
import type { AgentChoice, AgentOption } from "../terminalContract";
import { AgentSelect } from "./AgentSelect";

type Props = { agents: AgentOption[]; value: AgentChoice; onChange?: (choice: AgentChoice) => void; readOnly?: boolean; disabled?: boolean; compact?: boolean };
type FieldProps = { agents: AgentOption[]; value: AgentChoice; onChange: (choice: AgentChoice) => void };

const EFFORT_RANK = ["low", "medium", "high", "xhigh", "max"];

function modelFor(agent: AgentOption, current: AgentChoice) {
  if (agent.agent === current.agent && agent.models.includes(current.model)) return current.model;
  return agent.modelOptions?.find((model) => model.isDefault)?.id ?? agent.models[0] ?? current.model;
}

function effortFor(agent: AgentOption, modelId: string, current: AgentChoice) {
  const model = agent.modelOptions?.find((option) => option.id === modelId);
  const efforts = model?.efforts ?? agent.efforts;
  if (agent.agent === current.agent && efforts.includes(current.effort)) return current.effort;
  if (agent.agent === "codex") return [...efforts].sort((a, b) => EFFORT_RANK.indexOf(b) - EFFORT_RANK.indexOf(a))[0] ?? current.effort;
  return efforts[0] ?? current.effort;
}

function choiceFor(agent: AgentOption, current: AgentChoice): AgentChoice {
  const model = modelFor(agent, current);
  return { agent: agent.agent, model, effort: effortFor(agent, model, current) };
}

function AgentRadio({ agent, checked, name, onPick }: { agent: AgentOption; checked: boolean; name: string; onPick: () => void }) {
  const reasonId = useId();
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="radio" name={name} checked={checked} disabled={!agent.available} aria-describedby={agent.reason ? reasonId : undefined} onChange={onPick} className="mt-1 size-4 accent-primary" />
      <span><span className="block font-medium text-ink">{agentLabel(agent.agent)}</span>{agent.reason ? <span id={reasonId} className="block text-ink-2">{agent.reason}</span> : null}</span>
    </label>
  );
}

function ModelAndEffort({ agents, value, onChange }: FieldProps) {
  const current = agents.find((agent) => agent.agent === value.agent);
  const models = current?.modelOptions?.map((model) => ({ value: model.id, label: model.label })) ?? (current?.models ?? [value.model]).map((model) => ({ value: model, label: modelLabel(model) }));
  const modelOptions = models.some((option) => option.value === value.model) ? models : [...models, { value: value.model, label: `${value.model} ${UNAVAILABLE_SUFFIX}`, disabled: true }];
  const selectedModel = current?.modelOptions?.find((model) => model.id === value.model);
  const efforts = selectedModel?.efforts ?? current?.efforts ?? [value.effort];
  return (
    <>
      <AgentSelect label={MODEL_FIELD_LABEL} value={value.model} options={modelOptions} onChange={(model) => onChange({ ...value, model, effort: current ? effortFor(current, model, value) : value.effort })} />
      <AgentSelect label={EFFORT_FIELD_LABEL} value={value.effort} options={efforts.map((effort) => ({ value: effort, label: effortLabel(effort) }))} onChange={(effort) => onChange({ ...value, effort })} />
      {current && !current.models.includes(value.model) ? <p role="alert" className="text-sm text-destructive">O modelo {value.model} não está mais disponível no Codex. Troque o modelo da sessão.</p> : null}
      {selectedModel && !selectedModel.efforts.includes(value.effort) ? <p role="alert" className="text-sm text-destructive">O esforço salvo não está disponível para este modelo.</p> : null}
    </>
  );
}

function CompactChoice({ agents, value, onChange }: FieldProps) {
  const options = agents.map((agent) => ({ value: agent.agent, label: agent.available ? agentLabel(agent.agent) : `${agentLabel(agent.agent)} ${UNAVAILABLE_SUFFIX}`, disabled: !agent.available }));
  const pick = (agentId: string) => {
    const agent = agents.find((candidate) => candidate.agent === agentId);
    if (agent) onChange(choiceFor(agent, value));
  };
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <AgentSelect label={AGENT_FIELD_LABEL} value={value.agent} options={options} onChange={pick} />
      <ModelAndEffort agents={agents} value={value} onChange={onChange} />
    </div>
  );
}

export function AgentChoiceField({ agents, value, onChange, readOnly = false, disabled = false, compact = false }: Props) {
  const name = useId();
  if (readOnly || !onChange) return <p className="text-sm text-ink">{agentChoiceLabel(value)}</p>;
  if (compact) return <fieldset disabled={disabled}><CompactChoice agents={agents} value={value} onChange={onChange} /></fieldset>;
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-medium text-ink">{AGENT_FIELD_LABEL}</legend>
      <div className="space-y-2">{agents.map((agent) => <AgentRadio key={agent.agent} agent={agent} name={name} checked={agent.agent === value.agent} onPick={() => onChange(choiceFor(agent, value))} />)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><ModelAndEffort agents={agents} value={value} onChange={onChange} /></div>
    </fieldset>
  );
}
