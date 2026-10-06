import type { TaskLabel } from "@flow-dev/api/schemas/taskLabels";

const NEUTRAL_TONE = "border-line bg-accent text-ink-2";
const LABEL_TONE: Record<TaskLabel, string> = {
  frontend: "border-transparent bg-label-frontend-wash text-label-frontend-ink",
  backend: "border-transparent bg-label-backend-wash text-label-backend-ink",
  infra: "border-transparent bg-label-infra-wash text-label-infra-ink",
  docs: "border-transparent bg-label-docs-wash text-label-docs-ink",
  generica: NEUTRAL_TONE,
};

export function taskLabelTone(label: string) {
  return LABEL_TONE[label as TaskLabel] ?? NEUTRAL_TONE;
}
