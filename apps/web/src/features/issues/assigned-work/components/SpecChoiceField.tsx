import type { SpecItem } from "../taskSetContract";
import { SPEC_FIELD_LABEL } from "../agentChoiceCopy";
import { AgentSelect } from "./AgentSelect";

type Props = { specs: SpecItem[]; value: string; onChange: (artifactId: string) => void };

export function SpecChoiceField({ specs, value, onChange }: Props) {
  if (specs.length < 2) return null;
  return <AgentSelect label={SPEC_FIELD_LABEL} value={value} options={specs.map((spec) => ({ value: spec.artifactId, label: spec.path }))} onChange={onChange} />;
}
