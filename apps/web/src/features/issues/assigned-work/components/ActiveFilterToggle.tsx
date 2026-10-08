import { Button } from "@/components/ui/button";
import type { ActiveFilter } from "../contract";

const OPTIONS: { value: ActiveFilter; label: string }[] = [{ value: "mine", label: "Minhas" }, { value: "shared", label: "Do projeto" }];

type Props = { filter: ActiveFilter; busy: boolean; onSelect: (filter: ActiveFilter) => void };

export function ActiveFilterToggle({ filter, busy, onSelect }: Props) {
  return (
    <div role="group" aria-label="Filtrar trabalho em andamento" className="flex gap-1">
      {OPTIONS.map((option) => (
        <Button key={option.value} type="button" variant={filter === option.value ? "secondary" : "ghost"} size="sm" aria-pressed={filter === option.value} disabled={busy} onClick={() => onSelect(option.value)}>{option.label}</Button>
      ))}
    </div>
  );
}
