import { TASK_LABEL_DESCRIPTION, TASK_LABELS, type TaskLabel } from "@flow-dev/api/schemas/taskLabels";
import { taskLabelTone } from "@/components/tasks/taskLabelTone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAFT_FIELD_LABEL } from "../draftModel";

const AUTOMATION_NOTE = "Classificadas automaticamente a partir do texto e dos arquivos citados no draft. Ajuste se precisar; sem nenhuma marcada, a classificação automática volta a valer ao salvar.";
const DESTINATION_NOTE = "Ao criar a Issue, as labels vão junto para o GitHub.";

type Props = { labels: TaskLabel[]; onChange: (labels: TaskLabel[]) => void };

export function LabelsEditor({ labels, onChange }: Props) {
  function toggle(label: TaskLabel) {
    onChange(TASK_LABELS.filter((option) => (option === label ? !labels.includes(option) : labels.includes(option))));
  }
  return (
    <div className="space-y-2">
      <div role="group" aria-label={DRAFT_FIELD_LABEL.labels} className="flex flex-wrap gap-2">
        {TASK_LABELS.map((label) => (
          <Button key={label} type="button" size="sm" variant={labels.includes(label) ? "secondary" : "outline"} aria-pressed={labels.includes(label)} title={TASK_LABEL_DESCRIPTION[label]} onClick={() => toggle(label)} className={cn("rounded-full font-mono text-xs font-normal", labels.includes(label) && taskLabelTone(label))}>
            {label}
          </Button>
        ))}
      </div>
      <p className="max-w-[65ch] text-xs text-ink-3">{AUTOMATION_NOTE} {DESTINATION_NOTE}</p>
    </div>
  );
}
