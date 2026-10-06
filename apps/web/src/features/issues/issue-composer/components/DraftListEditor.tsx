import { PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { itemLabel: string; items: string[]; limit: number; onChange: (items: string[]) => void };

const NEW_ITEM = "";

export function DraftListEditor({ itemLabel, items, limit, onChange }: Props) {
  const name = itemLabel.toLowerCase();
  const replace = (index: number, value: string) => onChange(items.map((item, position) => (position === index ? value : item)));
  const remove = (index: number) => onChange(items.filter((_, position) => position !== index));
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input aria-label={`${itemLabel} ${index + 1}`} className="hover:border-ink-3" value={item} onChange={(event) => replace(index, event.target.value)} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${name} ${index + 1}`} onClick={() => remove(index)} className="size-10 shrink-0 rounded-md"><XIcon /></Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" disabled={items.length >= limit} onClick={() => onChange([...items, NEW_ITEM])} className="rounded-md text-project-ink hover:bg-project-wash hover:text-project-ink">
        <PlusIcon /> Adicionar {name}
      </Button>
      {items.length >= limit && <p className="text-xs text-ink-3">Limite de {limit} itens atingido.</p>}
    </div>
  );
}
