import { PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  criteria: string[];
  onChange: (criteria: string[]) => void;
};

export function DraftCriteriaEditor({ criteria, onChange }: Props) {
  return (
    <div className="space-y-2">
      {criteria.map((criterion, index) => (
        <div key={index} className="flex gap-2">
          <Input
            aria-label={`Critério ${index + 1}`}
            className="hover:border-ink-3"
            value={criterion}
            onChange={(event) => onChange(criteria.map((value, position) => (position === index ? event.target.value : value)))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remover critério ${index + 1}`}
            onClick={() => onChange(criteria.filter((_, position) => position !== index))}
            className="size-10 shrink-0 rounded-md"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...criteria, ""])}
        className="rounded-md text-project-ink hover:bg-project-wash hover:text-project-ink"
      >
        <PlusIcon /> Adicionar critério
      </Button>
    </div>
  );
}
