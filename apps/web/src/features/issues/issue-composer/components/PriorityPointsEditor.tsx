import { Button } from "@/components/ui/button";
import { DRAFT_FIELD_LABEL, PRIORITY_POINT_OPTIONS } from "../draftModel";

const SCALE_NOTE = "Opcional. De 1 (menor) a 5 (maior).";
const DESTINATION_NOTE = "Ao criar a Issue, os pontos vão para o campo numérico “Prioridade” do board do projeto. Sem esse campo no board, a Issue é criada sem os pontos.";

type Props = { points: number | null; onChange: (points: number | null) => void };

export function PriorityPointsEditor({ points, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div role="group" aria-label={DRAFT_FIELD_LABEL.priorityPoints} className="flex flex-wrap gap-2">
        {PRIORITY_POINT_OPTIONS.map((option) => (
          <Button key={option} type="button" variant={option === points ? "default" : "outline"} aria-pressed={option === points} aria-label={`Prioridade ${option}`} onClick={() => onChange(option === points ? null : option)} className="size-10 rounded-md px-0 tabular-nums">
            {option}
          </Button>
        ))}
      </div>
      <p className="max-w-[65ch] text-xs text-ink-3">{SCALE_NOTE} {DESTINATION_NOTE}</p>
    </div>
  );
}
